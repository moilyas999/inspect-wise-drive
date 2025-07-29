-- Fix remaining functions with mutable search paths
CREATE OR REPLACE FUNCTION public.handle_new_business_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_vehicle_from_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_vehicle_id UUID;
BEGIN
  -- Create vehicle if it doesn't exist
  INSERT INTO public.vehicles (reg, vin, make, model, business_id)
  VALUES (NEW.reg, NEW.vin, NEW.make, NEW.model, NEW.business_id)
  ON CONFLICT (reg, business_id) DO NOTHING
  RETURNING id INTO new_vehicle_id;
  
  -- If vehicle already exists, get its ID
  IF new_vehicle_id IS NULL THEN
    SELECT id INTO new_vehicle_id 
    FROM public.vehicles 
    WHERE reg = NEW.reg AND business_id = NEW.business_id 
    LIMIT 1;
  END IF;
  
  -- Update the job with vehicle_id
  NEW.vehicle_id = new_vehicle_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_inspection_sections(p_job_id uuid, p_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  section_data RECORD;
  section_id UUID;
BEGIN
  -- Define standard inspection sections
  FOR section_data IN 
    SELECT unnest(ARRAY[
      'Exterior Condition',
      'Interior Condition', 
      'Engine Bay',
      'Undercarriage',
      'Wheels & Tires',
      'Lights & Electrical',
      'Brakes',
      'Suspension',
      'Transmission',
      'Documentation'
    ]) as section_name,
    unnest(ARRAY[1,2,3,4,5,6,7,8,9,10]) as section_order
  LOOP
    -- Insert section
    INSERT INTO public.inspection_sections (job_id, section_name, section_order, business_id)
    VALUES (p_job_id, section_data.section_name, section_data.section_order, p_business_id)
    RETURNING id INTO section_id;
    
    -- Add specific items for each section
    CASE section_data.section_name
      WHEN 'Exterior Condition' THEN
        INSERT INTO public.inspection_items (section_id, job_id, item_name, item_description, requires_photo, business_id)
        VALUES 
          (section_id, p_job_id, 'Body Panels', 'Check for dents, scratches, rust', true, p_business_id),
          (section_id, p_job_id, 'Paint Condition', 'Overall paint quality and consistency', true, p_business_id),
          (section_id, p_job_id, 'Windows & Mirrors', 'Check for cracks, chips, functionality', true, p_business_id),
          (section_id, p_job_id, 'Bumpers', 'Front and rear bumper condition', true, p_business_id);
          
      WHEN 'Interior Condition' THEN
        INSERT INTO public.inspection_items (section_id, job_id, item_name, item_description, requires_photo, business_id)
        VALUES 
          (section_id, p_job_id, 'Seats', 'Check wear, tears, functionality', true, p_business_id),
          (section_id, p_job_id, 'Dashboard', 'Check for cracks, warning lights', true, p_business_id),
          (section_id, p_job_id, 'Electronics', 'Radio, AC, charging ports', false, p_business_id),
          (section_id, p_job_id, 'Carpets & Upholstery', 'Overall cleanliness and condition', true, p_business_id);
          
      WHEN 'Engine Bay' THEN
        INSERT INTO public.inspection_items (section_id, job_id, item_name, item_description, requires_photo, business_id)
        VALUES 
          (section_id, p_job_id, 'Engine Condition', 'Visual inspection of engine', true, p_business_id),
          (section_id, p_job_id, 'Fluid Levels', 'Oil, coolant, brake fluid', false, p_business_id),
          (section_id, p_job_id, 'Belt Condition', 'Timing belt, serpentine belt', true, p_business_id),
          (section_id, p_job_id, 'Battery', 'Terminals, age, charge level', true, p_business_id);
          
      ELSE
        -- Add default items for other sections
        INSERT INTO public.inspection_items (section_id, job_id, item_name, item_description, requires_photo, business_id)
        VALUES 
          (section_id, p_job_id, 'General Condition', 'Overall condition assessment', true, p_business_id),
          (section_id, p_job_id, 'Functionality', 'Working order and performance', false, p_business_id);
    END CASE;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_inspection_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create inspection sections for the new job
  PERFORM public.create_inspection_sections(NEW.id, NEW.business_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_sample_inspection_jobs()
RETURNS TABLE(jobs_created integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sample_inspector_id UUID;
  user_business_id UUID;
  jobs_count INTEGER;
  created_count INTEGER := 0;
BEGIN
  -- Get the current user's business ID
  SELECT get_user_business_id() INTO user_business_id;
  
  IF user_business_id IS NULL THEN
    RETURN QUERY SELECT 0, 'No business found for current user. Please ensure you are logged in as an admin.';
    RETURN;
  END IF;

  -- Get the first available inspector from the user's business
  SELECT i.id INTO sample_inspector_id
  FROM public.inspectors i
  JOIN public.user_roles ur ON i.user_id = ur.user_id
  WHERE ur.role = 'staff' AND i.business_id = user_business_id
  LIMIT 1;

  -- If no staff inspector found, use any inspector from the business
  IF sample_inspector_id IS NULL THEN
    SELECT i.id INTO sample_inspector_id
    FROM public.inspectors i
    WHERE i.business_id = user_business_id
    LIMIT 1;
  END IF;

  -- If still no inspector found, return error
  IF sample_inspector_id IS NULL THEN
    RETURN QUERY SELECT 0, 'No inspectors found in your business. Please create a staff user first.';
    RETURN;
  END IF;

  -- Check if jobs already exist for this business
  SELECT COUNT(*) INTO jobs_count 
  FROM public.inspection_jobs 
  WHERE business_id = user_business_id;
  
  IF jobs_count > 0 THEN
    RETURN QUERY SELECT 0, 'Inspection jobs already exist in your business.';
    RETURN;
  END IF;

  -- Insert sample jobs with proper business_id
  INSERT INTO public.inspection_jobs (
    reg, 
    make, 
    model, 
    vin, 
    seller_address, 
    assigned_to, 
    deadline, 
    status,
    business_id
  ) VALUES 
  (
    'AB21 XYZ',
    'BMW',
    '320d M Sport',
    'WBABH71090P123456',
    '123 Fleet Street, London, EC4A 2DY',
    sample_inspector_id,
    NOW() + INTERVAL '2 days',
    'not_started',
    user_business_id
  ),
  (
    'CD19 ABC',
    'Audi',
    'A4 Avant',
    'WAUZZZ8V7GA123456',
    '456 Commercial Road, Manchester, M15 4FN',
    sample_inspector_id,
    NOW() + INTERVAL '1 day',
    'in_progress',
    user_business_id
  ),
  (
    'EF22 DEF',
    'Mercedes-Benz',
    'C220d AMG Line',
    'WDD2050821F123456',
    '789 Business Park, Birmingham, B5 6QR',
    sample_inspector_id,
    NOW() + INTERVAL '3 days',
    'not_started',
    user_business_id
  ),
  (
    'GH23 HIJ',
    'Ford',
    'Focus ST-Line',
    'WF0FXXGCDFPR12345',
    '321 Industrial Estate, Leeds, LS10 1AB',
    sample_inspector_id,
    NOW() + INTERVAL '4 days',
    'submitted',
    user_business_id
  ),
  (
    'KL24 MNO',
    'Volkswagen',
    'Golf GTI',
    'WVWZZZ1KZAW123456',
    '654 Retail Park, Bristol, BS1 2CD',
    sample_inspector_id,
    NOW() + INTERVAL '6 hours',
    'not_started',
    user_business_id
  );

  GET DIAGNOSTICS created_count = ROW_COUNT;

  RETURN QUERY SELECT created_count, 'Successfully created ' || created_count || ' inspection jobs for vehicle purchase inspections.';
END;
$$;