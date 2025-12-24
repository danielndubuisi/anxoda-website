-- Add columns for change detection in live sheet connections
ALTER TABLE public.live_sheet_connections 
ADD COLUMN IF NOT EXISTS last_data_hash TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;