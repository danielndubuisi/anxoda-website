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

class AnalyzePayload(BaseModel):
    reportId: str
    userId: str
    signedUrl: str
    question: str | None = None
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
    expected = f"Bearer {AUTH_TOKEN}" if AUTH_TOKEN else None
    if expected and authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # 1) Download file
    try:
        content = download_with_fallback(payload.signedUrl)
    except Exception as e:
        supa.update_report(payload.reportId, {"processing_status": "failed", "error": f"Download failed: {e}"})
        raise HTTPException(400, detail=f"Download failed: {e}")

    # 2) Run EDA
    try:
        chart_json, images, pdf_bytes = eda_from_bytes(content)
    except Exception as e:
        supa.update_report(payload.reportId, {"processing_status": "failed", "error": f"EDA failed: {e}"})
        raise HTTPException(500, detail=f"EDA failed: {e}")

    # 3) Upload outputs
    from datetime import datetime
    ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S')
    base = f"{payload.userId}/{payload.reportId}/{ts}"
    pdf_path = f"{base}/eda_report.pdf"
    supa.upload(REPORTS_BUCKET, pdf_path, pdf_bytes, content_type="application/pdf")

    image_paths = []
    for name, img in images:
        p = f"{base}/images/{name}"
        supa.upload(REPORTS_BUCKET, p, img, content_type="image/png")
        image_paths.append(p)

    # 4) AI narrative with rich context
    summary_json = {"summary": "No summary generated.", "keyFindings": [], "recommendations": [], "nextSteps": []}
    if OPENAI_API_KEY:
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        # Extract rich context from payload
        ctx = payload.analysisContext or {}
        domain_type = ctx.get("domain", "business")
        domain_confidence = ctx.get("domainConfidence", 0)
        top_cats = ctx.get("topCategories", [])
        primary_metric = ctx.get("primaryMetrics", {})
        sample_records = ctx.get("sampleRecords", [])
        
        # Build comprehensive context with actual data
        full_context = json.dumps({
            "domain": domain_type,
            "domainConfidence": domain_confidence,
            "totalRows": ctx.get("totalRows", 0),
            "totalColumns": ctx.get("totalColumns", 0),
            "topCategories": top_cats,
            "primaryMetrics": primary_metric,
            "sampleRecords": sample_records[:5],
            "schema": chart_json.get("schema"),
            "kpi": chart_json.get("kpi"),
            "stats": ctx.get("descriptiveStats", {})
        }, ensure_ascii=False, indent=2)
        
        # Domain-specific instructions
        domain_instructions_map = {
            "hr": "Focus on workforce analytics: employee distribution, compensation, retention, department performance. Use HR terminology (headcount, attrition, compensation bands).",
            "sales": "Focus on revenue optimization, customer analysis, sales performance. Use sales terminology (transactions, conversion, revenue, customer segments).",
            "finance": "Focus on financial performance, cost analysis, budget optimization. Use finance terminology (expenses, budget variance, cost ratios).",
        }
        domain_instructions = domain_instructions_map.get(domain_type, "Focus on business metrics and data-driven insights relevant to this domain.")
        
        # Format sample records for prompt
        sample_records_str = json.dumps(sample_records[:5], ensure_ascii=False, indent=2) if sample_records else "No sample records available"
        
        prompt = USER_PROMPT_TEMPLATE.format(
            context=full_context,
            kpis=json.dumps(chart_json.get("kpi"), ensure_ascii=False),
            question=payload.question or "(none)",
            domain_type=domain_type,
            domain_confidence=domain_confidence,
            top_categories=", ".join(top_cats[:3]) if top_cats else "N/A",
            primary_metric_name=primary_metric.get("column", "value") if primary_metric else "value",
            sample_records=sample_records_str,
            domain_instructions=domain_instructions
        )
        try:
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
        except Exception as e:
            summary_json = {"summary": f"OpenAI failed: {e}", "keyFindings": [], "recommendations": [], "nextSteps": []}

    # 5) Update DB
    supa.update_report(payload.reportId, {
        "processing_status": "completed",
        "text_summary": summary_json,
        "chart_data": chart_json,
        "report_pdf_path": pdf_path,
        "image_paths": image_paths,
    })

    return {"ok": True, "pdf": pdf_path, "images": image_paths, "summary": summary_json, "chart_data": chart_json}
