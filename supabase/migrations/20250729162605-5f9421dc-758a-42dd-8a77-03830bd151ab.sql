-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Update inspection_jobs policies to allow admins to view all jobs
CREATE POLICY "Admins can view all inspection jobs" 
ON public.inspection_jobs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Update inspection_steps policies for admins
CREATE POLICY "Admins can view all inspection steps" 
ON public.inspection_steps 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Update inspection_faults policies for admins
CREATE POLICY "Admins can view all inspection faults" 
ON public.inspection_faults 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Update inspection_media policies for admins
CREATE POLICY "Admins can view all inspection media" 
ON public.inspection_media 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Update the inspector creation function to assign default staff role
CREATE OR REPLACE FUNCTION public.handle_new_inspector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert into inspectors table
  INSERT INTO public.inspectors (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Inspector'),
    NEW.email
  );
  
  -- Assign default staff role unless admin role is specified in metadata
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' = 'admin' THEN 'admin'::app_role
      ELSE 'staff'::app_role
    END
  );
  
  RETURN NEW;
END;
$$;

-- Add some sample admin and staff users data structure
-- Note: Actual users will be created through the auth signup process