-- Multi-business refactor: Create businesses table and update structure

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add business_id to existing tables
ALTER TABLE public.inspectors ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.inspection_jobs ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.inspection_steps ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.inspection_faults ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.inspection_media ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Add review status to inspection_jobs
ALTER TABLE public.inspection_jobs ADD COLUMN review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.inspection_jobs ADD COLUMN reviewed_by UUID REFERENCES public.inspectors(id);
ALTER TABLE public.inspection_jobs ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add flagged for repair to faults
ALTER TABLE public.inspection_faults ADD COLUMN flagged_for_repair BOOLEAN DEFAULT false;

-- Add admin tracking
ALTER TABLE public.inspectors ADD COLUMN created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.inspectors ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Enable RLS on businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Create policies for businesses
CREATE POLICY "Admins can view their business" 
ON public.businesses 
FOR SELECT 
USING (
  id IN (
    SELECT ur.user_id FROM public.user_roles ur 
    JOIN public.inspectors i ON ur.user_id = i.user_id 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can update their business" 
ON public.businesses 
FOR UPDATE 
USING (
  id IN (
    SELECT i.business_id FROM public.inspectors i 
    JOIN public.user_roles ur ON i.user_id = ur.user_id 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Update inspector policies for business isolation
DROP POLICY IF EXISTS "Inspectors can view their own profile" ON public.inspectors;
DROP POLICY IF EXISTS "Inspectors can update their own profile" ON public.inspectors;
DROP POLICY IF EXISTS "Inspectors can insert their own profile" ON public.inspectors;

CREATE POLICY "Users can view inspectors in their business" 
ON public.inspectors 
FOR SELECT 
USING (
  business_id IN (
    SELECT i.business_id FROM public.inspectors i 
    WHERE i.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage inspectors in their business" 
ON public.inspectors 
FOR ALL 
USING (
  business_id IN (
    SELECT i.business_id FROM public.inspectors i 
    JOIN public.user_roles ur ON i.user_id = ur.user_id 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Update inspection_jobs policies for business isolation
DROP POLICY IF EXISTS "Inspectors can view their assigned jobs" ON public.inspection_jobs;
DROP POLICY IF EXISTS "Inspectors can update their assigned jobs" ON public.inspection_jobs;
DROP POLICY IF EXISTS "Admins can view all inspection jobs" ON public.inspection_jobs;

CREATE POLICY "Users can view jobs in their business" 
ON public.inspection_jobs 
FOR SELECT 
USING (
  business_id IN (
    SELECT i.business_id FROM public.inspectors i 
    WHERE i.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can update their assigned jobs" 
ON public.inspection_jobs 
FOR UPDATE 
USING (
  assigned_to IN (
    SELECT i.id FROM public.inspectors i 
    WHERE i.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage jobs in their business" 
ON public.inspection_jobs 
FOR ALL 
USING (
  business_id IN (
    SELECT i.business_id FROM public.inspectors i 
    JOIN public.user_roles ur ON i.user_id = ur.user_id 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Update other table policies for business isolation
DROP POLICY IF EXISTS "Inspectors can manage steps for their jobs" ON public.inspection_steps;
DROP POLICY IF EXISTS "Admins can view all inspection steps" ON public.inspection_steps;

CREATE POLICY "Users can manage steps in their business" 
ON public.inspection_steps 
FOR ALL 
USING (
  business_id IN (
    SELECT i.business_id FROM public.inspectors i 
    WHERE i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Inspectors can manage faults for their jobs" ON public.inspection_faults;
DROP POLICY IF EXISTS "Admins can view all inspection faults" ON public.inspection_faults;

CREATE POLICY "Users can manage faults in their business" 
ON public.inspection_faults 
FOR ALL 
USING (
  business_id IN (
    SELECT i.business_id FROM public.inspectors i 
    WHERE i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Inspectors can manage media for their jobs" ON public.inspection_media;
DROP POLICY IF EXISTS "Admins can view all inspection media" ON public.inspection_media;

CREATE POLICY "Users can manage media in their business" 
ON public.inspection_media 
FOR ALL 
USING (
  business_id IN (
    SELECT i.business_id FROM public.inspectors i 
    WHERE i.user_id = auth.uid()
  )
);

-- Create function to get user's business ID
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

-- Update the user creation trigger for business context
CREATE OR REPLACE FUNCTION public.handle_new_business_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  new_business_id UUID;
BEGIN
  -- If this is an admin user, create a business first
  IF NEW.raw_user_meta_data ->> 'role' = 'admin' THEN
    INSERT INTO public.businesses (name)
    VALUES (COALESCE(NEW.raw_user_meta_data ->> 'business_name', 'New Business'))
    RETURNING id INTO new_business_id;
  END IF;

  -- Insert into inspectors table
  INSERT INTO public.inspectors (user_id, name, email, business_id, created_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'User'),
    NEW.email,
    new_business_id, -- Will be NULL for staff users, to be set later
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' = 'admin' THEN NEW.id
      ELSE NEW.raw_user_meta_data ->> 'created_by'::UUID
    END
  );
  
  -- Assign role
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

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created_inspector ON auth.users;
CREATE TRIGGER on_auth_user_created_business_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_business_user();

-- Add trigger to businesses
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();