-- Create profitpro_analyses table
CREATE TABLE public.profitpro_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'ProfitPro Analysis',
  source_report_id uuid REFERENCES public.spreadsheet_reports(id) ON DELETE SET NULL,
  source_connection_id uuid REFERENCES public.live_sheet_connections(id) ON DELETE SET NULL,
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  cvp_results jsonb,
  ai_insights jsonb,
  processing_status text NOT NULL DEFAULT 'processing',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profitpro_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own profitpro analyses"
ON public.profitpro_analyses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profitpro analyses"
ON public.profitpro_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profitpro analyses"
ON public.profitpro_analyses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profitpro analyses"
ON public.profitpro_analyses FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_profitpro_analyses_updated_at
BEFORE UPDATE ON public.profitpro_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();