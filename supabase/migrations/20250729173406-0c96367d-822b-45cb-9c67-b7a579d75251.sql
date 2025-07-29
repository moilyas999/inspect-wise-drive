-- Fix RLS policy for vehicles table to allow staff to insert vehicles
DROP POLICY IF EXISTS "Staff can insert vehicles in their business" ON public.vehicles;

CREATE POLICY "Staff can insert vehicles in their business" 
ON public.vehicles 
FOR INSERT 
WITH CHECK (business_id IN ( 
  SELECT i.business_id
  FROM inspectors i
  WHERE i.user_id = auth.uid()
));