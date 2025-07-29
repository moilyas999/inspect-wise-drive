-- Create some sample inspection jobs that can be assigned to any inspector
-- First, let's create a function to help create sample jobs for testing

-- Create a function to create sample jobs for any inspector
CREATE OR REPLACE FUNCTION public.create_sample_inspection_jobs()
RETURNS TABLE (
  jobs_created INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sample_inspector_id UUID;
  jobs_count INTEGER;
BEGIN
  -- Get the first available inspector (staff role)
  SELECT i.id INTO sample_inspector_id
  FROM public.inspectors i
  JOIN public.user_roles ur ON i.user_id = ur.user_id
  WHERE ur.role = 'staff'
  LIMIT 1;

  -- If no inspector found, return error
  IF sample_inspector_id IS NULL THEN
    RETURN QUERY SELECT 0, 'No staff inspectors found. Please create a staff user first.';
    RETURN;
  END IF;

  -- Check if jobs already exist
  SELECT COUNT(*) INTO jobs_count FROM public.inspection_jobs;
  
  IF jobs_count > 0 THEN
    RETURN QUERY SELECT 0, 'Sample jobs already exist in the system.';
    RETURN;
  END IF;

  -- Insert sample jobs
  INSERT INTO public.inspection_jobs (
    reg, 
    make, 
    model, 
    vin, 
    seller_address, 
    assigned_to, 
    deadline, 
    status
  ) VALUES 
  (
    'AB21 XYZ',
    'BMW',
    '320d M Sport',
    'WBABH71090P123456',
    '123 Fleet Street, London, EC4A 2DY',
    sample_inspector_id,
    NOW() + INTERVAL '2 days',
    'not_started'
  ),
  (
    'CD19 ABC',
    'Audi',
    'A4 Avant',
    'WAUZZZ8V7GA123456',
    '456 Commercial Road, Manchester, M15 4FN',
    sample_inspector_id,
    NOW() + INTERVAL '1 day',
    'in_progress'
  ),
  (
    'EF22 DEF',
    'Mercedes-Benz',
    'C220d AMG Line',
    'WDD2050821F123456',
    '789 Business Park, Birmingham, B5 6QR',
    sample_inspector_id,
    NOW() + INTERVAL '3 days',
    'not_started'
  ),
  (
    'GH23 HIJ',
    'Ford',
    'Focus ST-Line',
    'WF0FXXGCDFPR12345',
    '321 Industrial Estate, Leeds, LS10 1AB',
    sample_inspector_id,
    NOW() + INTERVAL '4 days',
    'submitted'
  ),
  (
    'KL24 MNO',
    'Volkswagen',
    'Golf GTI',
    'WVWZZZ1KZAW123456',
    '654 Retail Park, Bristol, BS1 2CD',
    sample_inspector_id,
    NOW() + INTERVAL '6 hours',
    'not_started'
  );

  RETURN QUERY SELECT 5, 'Successfully created 5 sample inspection jobs.';
END;
$$;