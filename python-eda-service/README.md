# Analytics Microservice + Supabase Edge Function

## Flow
1. User uploads file via Edge Function (index.ts).
2. Edge function:
   - Creates `reports` row
   - Uploads file to Supabase Storage
   - Creates signed URL
   - Calls Python FastAPI `/analyze`
3. Python service:
   - Downloads file
   - Runs `eda_from_bytes`
   - Uploads PDF/images
   - Calls OpenAI for summary JSON
   - Updates `reports` row with results

## Env Vars
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (Python)
- SUPABASE_ANON_KEY (Edge)
- PY_SERVICE_URL (Edge)
- PY_SERVICE_TOKEN (both)
- OPENAI_API_KEY (Python)

## Deployment
- Deploy `index.ts` as Supabase Edge function.
- Deploy Python service with Dockerfile.
