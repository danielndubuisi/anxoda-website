// 2) Create DB row (status=processing)
const initRow = await supabase.from("reports").insert({
id: reportId,
user_id: userId,
processing_status: "processing",
source_path: sourcePath,
question: question || null,
}).select("id").single();


if (initRow.error) return badRequest(`DB insert failed: ${initRow.error.message}`, 500);


// 3) Short-lived signed URL for Python to download
const signed = await supabase.storage
.from(REPORTS_BUCKET)
.createSignedUrl(sourcePath, 60); // 60s lifetime


if (signed.error) return badRequest(`Signed URL failed: ${signed.error.message}`, 500);


// 4) Call Python FastAPI /analyze (delegates EDA + AI entirely to Python)
const resp = await fetch(`${PY_SERVICE_URL}/analyze`, {
method: "POST",
headers: {
"content-type": "application/json",
"authorization": `Bearer ${PY_SERVICE_TOKEN}`,
},
body: JSON.stringify({
userId,
reportId,
signedUrl: signed.data.signedUrl,
question: question || null,
}),
});


if (!resp.ok) {
const errText = await resp.text();
// Mark as failed for observability
await supabase.from("reports").update({
processing_status: "failed",
error: errText.slice(0, 5000),
}).eq("id", reportId);
return badRequest(`Python analyze failed: ${errText}`, 502);
}


const result = await resp.json();


// Optionally, you can return the Python result directly
return new Response(JSON.stringify({
reportId,
status: "queued",
result,
}), { headers: { "content-type": "application/json" } });
} catch (e) {
    return badRequest(`Unhandled error: ${e instanceof Error ? e.message : String(e)}`, 500);
}
});

