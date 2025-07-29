-- Fix the create_sample_inspection_jobs function to work with RLS policies
DROP FUNCTION IF EXISTS public.create_sample_inspection_jobs();

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