-- Add connection_id column to spreadsheet_reports to link reports to live sheet connections
ALTER TABLE public.spreadsheet_reports 
ADD COLUMN connection_id uuid REFERENCES public.live_sheet_connections(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX idx_spreadsheet_reports_connection_id ON public.spreadsheet_reports(connection_id);