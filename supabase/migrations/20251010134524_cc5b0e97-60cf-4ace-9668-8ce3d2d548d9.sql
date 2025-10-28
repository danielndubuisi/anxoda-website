-- Phase 1: Critical Security Fixes

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Fix contact_submissions RLS - drop existing policy
DROP POLICY IF EXISTS "Only authenticated users can view contact submissions" ON public.contact_submissions;

-- 7. Create new admin-only policy for contact_submissions
CREATE POLICY "Only admins can view contact submissions" 
ON public.contact_submissions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Fix newsletter_subscriptions RLS - drop existing policy
DROP POLICY IF EXISTS "Only authenticated users can view newsletter subscriptions" ON public.newsletter_subscriptions;

-- 9. Create new admin-only policy for newsletter_subscriptions
CREATE POLICY "Only admins can view newsletter subscriptions"
ON public.newsletter_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 10. Add RLS policies for reports storage bucket
CREATE POLICY "Users can view their own reports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'reports' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role can upload reports"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'reports'
  AND auth.role() = 'service_role'
);

CREATE POLICY "Users can delete their own reports"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'reports'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 11. Ensure reports bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'reports';