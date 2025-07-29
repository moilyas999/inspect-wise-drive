-- First, let's check if there are any issues with our trigger and fix them
-- Update the trigger to be more robust and handle edge cases

CREATE OR REPLACE FUNCTION public.handle_new_business_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  new_business_id UUID;
  creator_id UUID;
BEGIN
  -- Log the incoming user data for debugging
  RAISE LOG 'Creating user with metadata: %', NEW.raw_user_meta_data;
  
  -- If this is an admin user, create a business first
  IF NEW.raw_user_meta_data ->> 'role' = 'admin' THEN
    INSERT INTO public.businesses (name)
    VALUES (COALESCE(NEW.raw_user_meta_data ->> 'business_name', 'New Business'))
    RETURNING id INTO new_business_id;
    
    creator_id := NEW.id; -- Admin creates themselves
    RAISE LOG 'Created business % for admin %', new_business_id, NEW.id;
  ELSE
    -- For staff users, try to get business_id and creator from metadata
    BEGIN
      new_business_id := NULLIF(NEW.raw_user_meta_data ->> 'business_id', '')::UUID;
      creator_id := NULLIF(NEW.raw_user_meta_data ->> 'created_by', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error parsing UUIDs from metadata: %', SQLERRM;
      -- If parsing fails, leave as NULL and continue
      new_business_id := NULL;
      creator_id := NULL;
    END;
  END IF;

  -- Insert into inspectors table
  INSERT INTO public.inspectors (user_id, name, email, business_id, created_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email, 'User'),
    NEW.email,
    new_business_id,
    creator_id
  );
  
  RAISE LOG 'Created inspector record for user %', NEW.id;
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' = 'admin' THEN 'admin'::app_role
      ELSE 'staff'::app_role
    END
  );
  
  RAISE LOG 'Assigned role % to user %', 
    CASE WHEN NEW.raw_user_meta_data ->> 'role' = 'admin' THEN 'admin' ELSE 'staff' END,
    NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_business_user: %', SQLERRM;
    -- Re-raise the error so signup fails if there's a problem
    RAISE;
END;
$$;