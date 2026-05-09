CREATE TABLE public.ai_usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  identifier text NOT NULL,
  day date NOT NULL DEFAULT current_date,
  count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (scope, identifier, day)
);

ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_usage_counters_lookup
  ON public.ai_usage_counters (scope, identifier, day);

CREATE TRIGGER trg_ai_usage_counters_updated_at
  BEFORE UPDATE ON public.ai_usage_counters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();