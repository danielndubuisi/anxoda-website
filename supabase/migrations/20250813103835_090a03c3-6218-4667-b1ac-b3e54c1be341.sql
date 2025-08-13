-- Fix security issues: Add RLS policies to prevent public access to sensitive data

-- Restrict access to contact_submissions table
DROP POLICY IF EXISTS "Anyone can insert contact submissions" ON public.contact_submissions;

CREATE POLICY "Anyone can insert contact submissions" 
ON public.contact_submissions 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Only authenticated users (staff) can read contact submissions
CREATE POLICY "Only authenticated users can view contact submissions" 
ON public.contact_submissions 
FOR SELECT 
TO authenticated 
USING (true);

-- Restrict access to newsletter_subscriptions table  
DROP POLICY IF EXISTS "Anyone can insert newsletter subscriptions" ON public.newsletter_subscriptions;

CREATE POLICY "Anyone can insert newsletter subscriptions" 
ON public.newsletter_subscriptions 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Only authenticated users (staff) can read newsletter subscriptions
CREATE POLICY "Only authenticated users can view newsletter subscriptions" 
ON public.newsletter_subscriptions 
FOR SELECT 
TO authenticated 
USING (true);