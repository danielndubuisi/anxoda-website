
-- Fix 1: Remove overly permissive storage INSERT policy on spreadsheets bucket
DROP POLICY IF EXISTS "Authenticated can upload" ON storage.objects;

-- Fix 2: Lock down user_subscriptions to prevent self-upgrade
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

-- Users keep SELECT-only access to their subscription. INSERT/UPDATE is service-role only
-- (no policy = denied for non-service callers, since RLS is enabled).

-- Provide a SECURITY DEFINER helper for backend payment webhooks/edge functions.
-- Service role bypasses RLS anyway, but this gives a typed/auditable entry point.
CREATE OR REPLACE FUNCTION public.set_user_subscription(
  _user_id uuid,
  _plan plan_type,
  _status text,
  _stripe_customer_id text DEFAULT NULL,
  _stripe_subscription_id text DEFAULT NULL,
  _current_period_start timestamptz DEFAULT NULL,
  _current_period_end timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the service role may call this; block authenticated/anon callers.
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.user_subscriptions (
    user_id, plan, subscription_status,
    stripe_customer_id, stripe_subscription_id,
    current_period_start, current_period_end
  ) VALUES (
    _user_id, _plan, _status,
    _stripe_customer_id, _stripe_subscription_id,
    _current_period_start, _current_period_end
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    subscription_status = EXCLUDED.subscription_status,
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, public.user_subscriptions.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, public.user_subscriptions.stripe_subscription_id),
    current_period_start = COALESCE(EXCLUDED.current_period_start, public.user_subscriptions.current_period_start),
    current_period_end = COALESCE(EXCLUDED.current_period_end, public.user_subscriptions.current_period_end),
    updated_at = now();
END;
$$;

-- Make sure user_subscriptions has a unique constraint on user_id for the upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Lock down execution of the helper to service role only
REVOKE ALL ON FUNCTION public.set_user_subscription(uuid, plan_type, text, text, text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_subscription(uuid, plan_type, text, text, text, timestamptz, timestamptz) TO service_role;
