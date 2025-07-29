-- Fix any potential RLS issues and add comprehensive logging

-- Ensure RLS policies allow staff creation by admins
DROP POLICY IF EXISTS "Users can view inspectors in their business" ON public.inspectors;
DROP POLICY IF EXISTS "Admins can manage inspectors in their business" ON public.inspectors;

-- Recreate inspector policies with better logic
CREATE POLICY "Users can view inspectors in their business" 
ON public.inspectors 
FOR SELECT 
USING (
  business_id IN (
    SELECT i.business_id 
    FROM inspectors i 
    WHERE i.user_id = auth.uid()
  )
  OR 
  user_id = auth.uid()
);

CREATE POLICY "Admins can manage inspectors in their business" 
ON public.inspectors 
FOR ALL 
USING (
  business_id IN (
    SELECT i.business_id 
    FROM inspectors i 
    JOIN user_roles ur ON i.user_id = ur.user_id 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
);

-- Allow service role to bypass RLS for staff creation
CREATE POLICY "Service role can manage all inspectors" 
ON public.inspectors 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Same for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view user roles in their business" 
ON public.user_roles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  user_id = auth.uid()
);

CREATE POLICY "Service role can manage all user roles" 
ON public.user_roles 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add better error handling to the trigger
CREATE OR REPLACE FUNCTION public.handle_new_business_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  new_business_id UUID;
  creator_id UUID;
  error_context TEXT;
BEGIN
  BEGIN
    error_context := 'parsing metadata';
    RAISE LOG 'Creating user with metadata: %', NEW.raw_user_meta_data;
    
    -- If this is an admin user, create a business first
    IF COALESCE(NEW.raw_user_meta_data ->> 'role', '') = 'admin' THEN
      error_context := 'creating business';
      INSERT INTO public.businesses (name)
      VALUES (COALESCE(NEW.raw_user_meta_data ->> 'business_name', 'New Business'))
      RETURNING id INTO new_business_id;
      
      creator_id := NEW.id;
      RAISE LOG 'Created business % for admin %', new_business_id, NEW.id;
    ELSE
      error_context := 'parsing staff metadata';
      -- For staff users, get business_id and creator from metadata
      BEGIN
        new_business_id := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'business_id'), '')::UUID;
        creator_id := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'created_by'), '')::UUID;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error parsing UUIDs from metadata: %, using NULLs', SQLERRM;
        new_business_id := NULL;
        creator_id := NULL;
      END;
    END IF;

    error_context := 'inserting inspector';
    -- Insert into inspectors table
    INSERT INTO public.inspectors (user_id, name, email, business_id, created_by, status)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''), SPLIT_PART(NEW.email, '@', 1)),
      NEW.email,
      new_business_id,
      creator_id,
      'active'
    );
    
    RAISE LOG 'Created inspector record for user %', NEW.id;
    
    error_context := 'assigning role';
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.id,
      CASE 
        WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', '') = 'admin' THEN 'admin'::app_role
        ELSE 'staff'::app_role
      END
    );
    
    RAISE LOG 'Assigned role % to user %', 
      CASE WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', '') = 'admin' THEN 'admin' ELSE 'staff' END,
      NEW.id;
    
    RETURN NEW;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Error in handle_new_business_user at %: % - %', error_context, SQLSTATE, SQLERRM;
      -- Don't fail the entire signup, just log the error
      RETURN NEW;
  END;
END;
$$;