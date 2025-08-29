-- Add columns for Python EDA microservice integration
alter table spreadsheet_reports
  add column if not exists report_pdf_path text,
  add column if not exists image_paths jsonb,
  add column if not exists chart_data jsonb,
  add column if not exists text_summary jsonb,
  add column if not exists processing_status text default 'processing',
  add column if not exists error_message text;
