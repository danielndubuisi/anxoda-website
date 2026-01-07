-- Create table for live sheet connections
CREATE TABLE public.live_sheet_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sheet_url TEXT NOT NULL,
  sheet_type TEXT NOT NULL CHECK (sheet_type IN ('google_sheets', 'excel_online')),
  sheet_name TEXT NOT NULL,
  schedule_frequency TEXT NOT NULL CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_report_id UUID REFERENCES public.spreadsheet_reports(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_sheet_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own connections"
ON public.live_sheet_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections"
ON public.live_sheet_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
ON public.live_sheet_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
ON public.live_sheet_connections FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_live_sheet_connections_updated_at
BEFORE UPDATE ON public.live_sheet_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for scheduled processing
CREATE INDEX idx_live_sheet_next_run ON public.live_sheet_connections(next_run_at) WHERE is_active = true;