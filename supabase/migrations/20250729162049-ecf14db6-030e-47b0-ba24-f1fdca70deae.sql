-- Insert sample inspection data for testing
-- First, we need to create a sample inspector (this will be created automatically when a user signs up)
-- Let's insert some sample inspection jobs

-- Note: You'll need to replace the assigned_to UUID with an actual inspector ID after creating a user
-- For now, let's create some placeholder data structure

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
  '00000000-0000-0000-0000-000000000000', -- This will be replaced with actual inspector ID
  NOW() + INTERVAL '2 days',
  'not_started'
),
(
  'CD19 ABC',
  'Audi',
  'A4 Avant',
  'WAUZZZ8V7GA123456',
  '456 Commercial Road, Manchester, M15 4FN',
  '00000000-0000-0000-0000-000000000000', -- This will be replaced with actual inspector ID
  NOW() + INTERVAL '1 day',
  'in_progress'
),
(
  'EF22 DEF',
  'Mercedes-Benz',
  'C220d AMG Line',
  'WDD2050821F123456',
  '789 Business Park, Birmingham, B5 6QR',
  '00000000-0000-0000-0000-000000000000', -- This will be replaced with actual inspector ID
  NOW() + INTERVAL '3 days',
  'not_started'
);