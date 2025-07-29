-- Create vehicles table as canonical profile
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reg TEXT NOT NULL,
  vin TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inspection',
  current_stage TEXT NOT NULL DEFAULT 'inspection',
  business_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicles
CREATE POLICY "Users can view vehicles in their business" 
ON public.vehicles 
FOR SELECT 
USING (business_id IN (
  SELECT i.business_id 
  FROM inspectors i 
  WHERE i.user_id = auth.uid()
));

CREATE POLICY "Admins can manage vehicles in their business" 
ON public.vehicles 
FOR ALL 
USING (business_id IN (
  SELECT i.business_id 
  FROM inspectors i 
  JOIN user_roles ur ON i.user_id = ur.user_id 
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
));

-- Add vehicle_id to inspection_jobs
ALTER TABLE public.inspection_jobs 
ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id);

-- Add vehicle_id to inspection_media
ALTER TABLE public.inspection_media 
ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id);

-- Add vehicle_id to inspection_faults
ALTER TABLE public.inspection_faults 
ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id);

-- Add vehicle_id to inspection_steps
ALTER TABLE public.inspection_steps 
ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id);

-- Create prep_progress table for repair tracking
CREATE TABLE public.prep_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fault_id UUID NOT NULL REFERENCES public.inspection_faults(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  business_id UUID NOT NULL,
  repaired_by UUID REFERENCES public.inspectors(id),
  repair_photo_url TEXT,
  repair_video_url TEXT,
  parts_used TEXT,
  time_taken INTEGER, -- minutes
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on prep_progress
ALTER TABLE public.prep_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for prep_progress
CREATE POLICY "Users can manage prep progress in their business" 
ON public.prep_progress 
FOR ALL 
USING (business_id IN (
  SELECT i.business_id 
  FROM inspectors i 
  WHERE i.user_id = auth.uid()
));

-- Add trigger for vehicles updated_at
CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for prep_progress updated_at
CREATE TRIGGER update_prep_progress_updated_at
BEFORE UPDATE ON public.prep_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update inspection_media to support video types and sections
ALTER TABLE public.inspection_media 
ADD COLUMN IF NOT EXISTS duration INTEGER, -- for videos in seconds
ADD COLUMN IF NOT EXISTS file_size INTEGER; -- in bytes

-- Create function to create vehicle from inspection job
CREATE OR REPLACE FUNCTION public.create_vehicle_from_job()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create vehicles from jobs
CREATE TRIGGER create_vehicle_from_job_trigger
BEFORE INSERT ON public.inspection_jobs
FOR EACH ROW
EXECUTE FUNCTION public.create_vehicle_from_job();

-- Add unique constraint to prevent duplicate vehicles per business
ALTER TABLE public.vehicles 
ADD CONSTRAINT unique_reg_per_business UNIQUE (reg, business_id);