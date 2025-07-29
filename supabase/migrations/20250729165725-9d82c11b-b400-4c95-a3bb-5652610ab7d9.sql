-- Fix infinite recursion in RLS policies by using security definer functions

-- Create security definer function to get user's business ID
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.business_id 
  FROM public.inspectors i 
  WHERE i.user_id = auth.uid()
  LIMIT 1
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view inspectors in their business" ON public.inspectors;
DROP POLICY IF EXISTS "Admins can manage inspectors in their business" ON public.inspectors;

-- Create new policies using security definer functions (no recursion)
CREATE POLICY "Users can view inspectors in their business" 
ON public.inspectors 
FOR SELECT 
USING (
  business_id = public.get_user_business_id()
  OR 
  user_id = auth.uid()
);

CREATE POLICY "Admins can manage inspectors in their business" 
ON public.inspectors 
FOR ALL 
USING (
  (business_id = public.get_user_business_id() AND public.is_user_admin())
  OR
  user_id = auth.uid()
);

-- Also fix user_roles policies to avoid potential recursion
DROP POLICY IF EXISTS "Admins can view user roles in their business" ON public.user_roles;

CREATE POLICY "Admins can view user roles in their business" 
ON public.user_roles 
FOR SELECT 
USING (
  public.is_user_admin() OR 
  user_id = auth.uid()
);