-- Fix the business user creation trigger to handle created_by properly
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
  -- If this is an admin user, create a business first
  IF NEW.raw_user_meta_data ->> 'role' = 'admin' THEN
    INSERT INTO public.businesses (name)
    VALUES (COALESCE(NEW.raw_user_meta_data ->> 'business_name', 'New Business'))
    RETURNING id INTO new_business_id;
    
    creator_id := NEW.id; -- Admin creates themselves
  ELSE
    -- For staff users, try to get business_id and creator from metadata
    new_business_id := (NEW.raw_user_meta_data ->> 'business_id')::UUID;
    creator_id := (NEW.raw_user_meta_data ->> 'created_by')::UUID;
  END IF;

  -- Insert into inspectors table
  INSERT INTO public.inspectors (user_id, name, email, business_id, created_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'User'),
    NEW.email,
    new_business_id,
    creator_id
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