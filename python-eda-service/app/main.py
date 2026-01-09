from __future__ import annotations
import logging
logging.basicConfig(level=logging.INFO)
from dotenv import load_dotenv
load_dotenv()
import os, json, requests
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from openai import OpenAI

from eda import eda_from_bytes
from supa import Supa
from prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

app = FastAPI()

@app.get("/")
async def read_root():
    return {"Hello": "World"}

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
REPORTS_BUCKET = os.environ.get("REPORTS_BUCKET", "reports")
AUTH_TOKEN = os.environ.get("PY_SERVICE_TOKEN")  # shared secret
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

if not (SUPABASE_URL and SUPABASE_SERVICE_KEY):
    raise RuntimeError("Missing Supabase env vars")

supa = Supa(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def sanitize_error_message(error: Exception) -> str:
    """Return user-friendly error without internal details"""
    error_map = {
        requests.exceptions.RequestException: "Failed to download file",
        FileNotFoundError: "File not found",
        ValueError: "Invalid data format",
        RuntimeError: "Processing error occurred",
        json.JSONDecodeError: "Invalid data format",
    }
    
    for exc_type, message in error_map.items():
        if isinstance(error, exc_type):
            return message
    
    return "An error occurred during processing"

class AnalyzePayload(BaseModel):
    reportId: str
    userId: str
    signedUrl: str
    question: str | None = None
    skipAI: bool = False
    aiInsights: dict | None = None
    analysisContext: dict | None = None

def download_with_fallback(signed_url: str) -> bytes:
    if not signed_url.lower().startswith("http"):
        data = supa.download(signed_url)
        if data is None:
            raise RuntimeError("Failed to download object from Supabase via service key.")
        return data

    r = requests.get(signed_url, timeout=60)
    if r.status_code == 200:
        return r.content
    raise RuntimeError(f"Failed to download signed URL (status={r.status_code}).")

@app.post("/analyze")
def analyze(payload: AnalyzePayload, authorization: str = Header(None)):
    logging.info(f"=== Analyze Request Started ===")
    logging.info(f"Report ID: {payload.reportId}")
    logging.info(f"User ID: {payload.userId}")
    logging.info(f"Signed URL: {payload.signedUrl[:60]}...")
    logging.info(f"Skip AI: {payload.skipAI}")
    logging.info(f"Has Pre-computed Insights: {payload.aiInsights is not None}")
    
    expected = f"Bearer {AUTH_TOKEN}" if AUTH_TOKEN else None
    if expected and authorization != expected:
        logging.error(f"Unauthorized request for report {payload.reportId}")
        raise HTTPException(status_code=401, detail="Unauthorized")

    # 1) Download file
    logging.info(f"Downloading file from signed URL for report {payload.reportId}")
    try:
        content = download_with_fallback(payload.signedUrl)
        logging.info(f"File downloaded successfully: {len(content)} bytes")
    except Exception as e:
        user_message = sanitize_error_message(e)
        logging.error(f"Download failed for report {payload.reportId}: {e}", exc_info=True)
        supa.update_report(payload.reportId, {"processing_status": "failed", "error_message": user_message})
        raise HTTPException(400, detail=user_message)

    # 2) Run EDA
    logging.info(f"Running EDA analysis for report {payload.reportId}")
    try:
        chart_json, images, pdf_bytes = eda_from_bytes(content)
        logging.info(f"EDA completed: {len(images)} images generated, PDF size: {len(pdf_bytes)} bytes")
    except Exception as e:
        user_message = sanitize_error_message(e)
        logging.error(f"EDA failed for report {payload.reportId}: {e}", exc_info=True)
        supa.update_report(payload.reportId, {"processing_status": "failed", "error_message": user_message})
        raise HTTPException(500, detail=user_message)

    # 3) Upload outputs
    logging.info(f"Uploading outputs to {REPORTS_BUCKET} bucket for report {payload.reportId}")
    from datetime import datetime
    ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S')
    base = f"{payload.userId}/{payload.reportId}/{ts}"
    pdf_path = f"{base}/eda_report.pdf"
    supa.upload(REPORTS_BUCKET, pdf_path, pdf_bytes, content_type="application/pdf")
    logging.info(f"PDF uploaded: {pdf_path}")

    image_paths = []
    for name, img in images:
        p = f"{base}/images/{name}"
        supa.upload(REPORTS_BUCKET, p, img, content_type="image/png")
        image_paths.append(p)
    logging.info(f"Uploaded {len(image_paths)} images")

    # 4) AI narrative - use pre-computed insights if skipAI flag is set
    if payload.skipAI and payload.aiInsights:
        # Use pre-computed insights from TypeScript pipeline
        summary_json = payload.aiInsights
        logging.info("Using pre-computed AI insights from process-spreadsheet pipeline")
    else:
        # Try AI providers in priority order: Lovable AI → OpenAI → Basic fallback
        LOVABLE_API_KEY = os.getenv("LOVABLE_API_KEY")
        OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        
        summary_json = {"summary": "No summary generated.", "keyFindings": [], "recommendations": [], "nextSteps": []}
        
        # Prepare context for AI
        if payload.analysisContext:
            context = json.dumps(payload.analysisContext, ensure_ascii=False)
            domain_type = payload.analysisContext.get("domain", "business")
        else:
            context = json.dumps({"schema": chart_json.get("schema"), "kpi": chart_json.get("kpi")}, ensure_ascii=False)
            domain_type = "business"
        
        prompt = USER_PROMPT_TEMPLATE.format(
            context=context, 
            kpis=json.dumps(chart_json.get("kpi")), 
            question=payload.question or "(none)",
            domain_type=domain_type
        )
        
        # Try Lovable AI first
        if LOVABLE_API_KEY:
            logging.info("Attempting Lovable AI for insights generation")
            try:
                import requests
                response = requests.post(
                    "https://ai.gateway.lovable.dev/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {LOVABLE_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "google/gemini-2.5-flash",
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.0,
                        "max_tokens": 900,
                        "response_format": {"type": "json_object"}
                    },
                    timeout=30
                )
                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]
                    summary_json = json.loads(content)
                    logging.info("Lovable AI insights generated successfully")
                elif response.status_code == 429:
                    logging.warning("Lovable AI rate limit exceeded, trying OpenAI")
                elif response.status_code == 402:
                    logging.warning("Lovable AI quota exceeded, trying OpenAI")
                else:
                    logging.warning(f"Lovable AI failed with status {response.status_code}, trying OpenAI")
            except Exception as e:
                logging.error(f"Lovable AI error: {e}, trying OpenAI")
        
        # Try OpenAI if Lovable AI failed or is unavailable
        if OPENAI_API_KEY and summary_json.get("summary") == "No summary generated.":
            logging.info("Attempting OpenAI for insights generation")
            try:
                client = OpenAI(api_key=OPENAI_API_KEY)
                resp = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.0,
                    max_tokens=900,
                )
                msg = resp.choices[0].message.content
                summary_json = json.loads(msg)
                logging.info("OpenAI insights generated successfully")
            except Exception as e:
                logging.error(f"OpenAI error: {e}")
                summary_json = {"summary": f"AI generation failed: {e}", "keyFindings": [], "recommendations": [], "nextSteps": []}
        
        # If both AI providers failed, summary_json will have the default "No summary generated."
        if summary_json.get("summary") == "No summary generated.":
            logging.warning("All AI providers unavailable or failed, using basic fallback")

    # 5) Update DB - only update PDF paths and status, don't overwrite text_summary if skipAI
    logging.info(f"Updating database for report {payload.reportId}")
    update_data = {
        "processing_status": "completed",
        "report_pdf_path": pdf_path,
        "image_paths": image_paths,
    }
    
    # Only update text_summary and chart_data if we generated them (not using pre-computed)
    if not payload.skipAI:
        update_data["text_summary"] = summary_json
        update_data["chart_data"] = chart_json
        logging.info(f"Updated with fresh AI insights and chart data")
    else:
        logging.info(f"Using pre-computed insights from process-spreadsheet")
    
    supa.update_report(payload.reportId, update_data)
    
    logging.info(f"=== Analysis Completed Successfully for report {payload.reportId} ===")
    return {"ok": True, "pdf": pdf_path, "images": image_paths, "summary": summary_json, "chart_data": chart_json}
