-- Fix RLS policy for inspection_jobs to allow staff to insert jobs in their business
DROP POLICY IF EXISTS "Staff can insert jobs in their business" ON public.inspection_jobs;

CREATE POLICY "Staff can insert jobs in their business" 
ON public.inspection_jobs 
FOR INSERT 
WITH CHECK (business_id IN ( 
  SELECT i.business_id
  FROM inspectors i
  WHERE i.user_id = auth.uid()
));