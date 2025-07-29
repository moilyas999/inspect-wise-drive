-- Fix all security definer functions to have proper search path
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT i.business_id 
  FROM public.inspectors i 
  WHERE i.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Add comprehensive RLS policies for all missing cases

-- Fix businesses table policies
DROP POLICY IF EXISTS "Admins can view their business" ON public.businesses;
CREATE POLICY "Users can view their business" 
ON public.businesses 
FOR SELECT 
USING (id IN ( 
  SELECT i.business_id
  FROM inspectors i
  WHERE i.user_id = auth.uid()
));

-- Add INSERT policy for inspection_media
DROP POLICY IF EXISTS "Staff can insert media in their business" ON public.inspection_media;
CREATE POLICY "Staff can insert media in their business" 
ON public.inspection_media 
FOR INSERT 
WITH CHECK (business_id IN ( 
  SELECT i.business_id
  FROM inspectors i
  WHERE i.user_id = auth.uid()
));

-- Add INSERT policy for inspection_sections  
DROP POLICY IF EXISTS "Staff can insert sections in their business" ON public.inspection_sections;
CREATE POLICY "Staff can insert sections in their business" 
ON public.inspection_sections 
FOR INSERT 
WITH CHECK (business_id IN ( 
  SELECT i.business_id
  FROM inspectors i
  WHERE i.user_id = auth.uid()
));

-- Add INSERT policy for inspection_items
DROP POLICY IF EXISTS "Staff can insert items in their business" ON public.inspection_items;
CREATE POLICY "Staff can insert items in their business" 
ON public.inspection_items 
FOR INSERT 
WITH CHECK (business_id IN ( 
  SELECT i.business_id
  FROM inspectors i
  WHERE i.user_id = auth.uid()
));

-- Add INSERT policy for inspection_faults
DROP POLICY IF EXISTS "Staff can insert faults in their business" ON public.inspection_faults;
CREATE POLICY "Staff can insert faults in their business" 
ON public.inspection_faults 
FOR INSERT 
WITH CHECK (business_id IN ( 
  SELECT i.business_id
  FROM inspectors i
  WHERE i.user_id = auth.uid()
));

-- Add INSERT policy for inspection_steps
DROP POLICY IF EXISTS "Staff can insert steps in their business" ON public.inspection_steps;
CREATE POLICY "Staff can insert steps in their business" 
ON public.inspection_steps 
FOR INSERT 
WITH CHECK (business_id IN ( 
  SELECT i.business_id
  FROM inspectors i
  WHERE i.user_id = auth.uid()
));

-- Add INSERT policy for prep_progress
DROP POLICY IF EXISTS "Staff can insert prep progress in their business" ON public.prep_progress;
CREATE POLICY "Staff can insert prep progress in their business" 
ON public.prep_progress 
FOR INSERT 
WITH CHECK (business_id IN ( 
  SELECT i.business_id
  FROM inspectors i
  WHERE i.user_id = auth.uid()
));