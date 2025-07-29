-- Enhanced inspection system database structure

-- Add missing columns to inspection_jobs for comprehensive vehicle data
ALTER TABLE public.inspection_jobs 
ADD COLUMN IF NOT EXISTS mileage INTEGER,
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS fuel_type TEXT,
ADD COLUMN IF NOT EXISTS transmission TEXT,
ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Create comprehensive inspection sections table
CREATE TABLE IF NOT EXISTS public.inspection_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.inspection_jobs(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  inspector_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  business_id UUID,
  UNIQUE(job_id, section_name)
);

-- Enable RLS on inspection_sections
ALTER TABLE public.inspection_sections ENABLE ROW LEVEL SECURITY;

-- Create policy for inspection_sections
CREATE POLICY "Users can manage sections in their business" 
ON public.inspection_sections 
FOR ALL 
USING (business_id IN (
  SELECT i.business_id 
  FROM inspectors i 
  WHERE i.user_id = auth.uid()
));

-- Create inspection items table for detailed checklist items
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.inspection_sections(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.inspection_jobs(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_description TEXT,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  condition_rating INTEGER CHECK (condition_rating >= 1 AND condition_rating <= 5),
  notes TEXT,
  requires_photo BOOLEAN DEFAULT false,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  business_id UUID
);

-- Enable RLS on inspection_items
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

-- Create policy for inspection_items
CREATE POLICY "Users can manage items in their business" 
ON public.inspection_items 
FOR ALL 
USING (business_id IN (
  SELECT i.business_id 
  FROM inspectors i 
  WHERE i.user_id = auth.uid()
));

-- Enhanced inspection_media table structure
ALTER TABLE public.inspection_media 
ADD COLUMN IF NOT EXISTS inspection_item_id UUID REFERENCES public.inspection_items(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS caption TEXT,
ADD COLUMN IF NOT EXISTS is_before_photo BOOLEAN DEFAULT true;

-- Create predefined inspection sections function
CREATE OR REPLACE FUNCTION public.create_inspection_sections(p_job_id UUID, p_business_id UUID)
RETURNS VOID
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

-- Create trigger to automatically create inspection sections when a job is created
CREATE OR REPLACE FUNCTION public.handle_new_inspection_job()
RETURNS TRIGGER
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

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_create_inspection_sections ON public.inspection_jobs;
CREATE TRIGGER trigger_create_inspection_sections
  AFTER INSERT ON public.inspection_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_inspection_job();

-- Update triggers for timestamp management
CREATE TRIGGER update_inspection_sections_updated_at
  BEFORE UPDATE ON public.inspection_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_items_updated_at
  BEFORE UPDATE ON public.inspection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();