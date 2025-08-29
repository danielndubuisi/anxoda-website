-- Create spreadsheet_reports table
CREATE TABLE public.spreadsheet_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'processing' CHECK (processing_status IN ('processing', 'completed', 'failed')),
  text_summary TEXT,
  chart_data JSONB,
  row_count INTEGER,
  column_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.spreadsheet_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE spreadsheet_reports
  ADD column if not exists report_pdf_path text,
  ADD column if not exists image_paths jsonb,
  ADD column if not exists chart_data jsonb,
  ADD column if not exists text_summary jsonb,
  ADD column if not exists processing_status text default 'processing',
  ADD column if not exists error_message text;

-- Create policies for user access
CREATE POLICY "Users can view their own reports" 
ON public.spreadsheet_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" 
ON public.spreadsheet_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" 
ON public.spreadsheet_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" 
ON public.spreadsheet_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_spreadsheet_reports_updated_at
BEFORE UPDATE ON public.spreadsheet_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for spreadsheets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('spreadsheets', 'spreadsheets', false);

-- Create storage policies for spreadsheet uploads
CREATE POLICY "Users can upload their own spreadsheets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'spreadsheets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own spreadsheets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'spreadsheets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own spreadsheets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'spreadsheets' AND auth.uid()::text = (storage.foldername(name))[1]);