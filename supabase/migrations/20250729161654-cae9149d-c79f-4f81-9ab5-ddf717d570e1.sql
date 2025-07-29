-- Create inspectors table for users
CREATE TABLE public.inspectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inspection_jobs table
CREATE TABLE public.inspection_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reg TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  vin TEXT,
  seller_address TEXT,
  assigned_to UUID NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inspection_steps table
CREATE TABLE public.inspection_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.inspection_jobs(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, section)
);

-- Create inspection_faults table
CREATE TABLE public.inspection_faults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.inspection_jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mechanical', 'bodywork')),
  description TEXT NOT NULL,
  location TEXT,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inspection_media table
CREATE TABLE public.inspection_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.inspection_jobs(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'photo',
  url TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lat DECIMAL,
  lng DECIMAL
);

-- Enable Row Level Security
ALTER TABLE public.inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_faults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_media ENABLE ROW LEVEL SECURITY;

-- Create policies for inspectors
CREATE POLICY "Inspectors can view their own profile" 
ON public.inspectors 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Inspectors can update their own profile" 
ON public.inspectors 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Inspectors can insert their own profile" 
ON public.inspectors 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for inspection_jobs
CREATE POLICY "Inspectors can view their assigned jobs" 
ON public.inspection_jobs 
FOR SELECT 
USING (assigned_to IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));

CREATE POLICY "Inspectors can update their assigned jobs" 
ON public.inspection_jobs 
FOR UPDATE 
USING (assigned_to IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));

-- Create policies for inspection_steps
CREATE POLICY "Inspectors can manage steps for their jobs" 
ON public.inspection_steps 
FOR ALL 
USING (job_id IN (
  SELECT id FROM public.inspection_jobs 
  WHERE assigned_to IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid())
));

-- Create policies for inspection_faults
CREATE POLICY "Inspectors can manage faults for their jobs" 
ON public.inspection_faults 
FOR ALL 
USING (job_id IN (
  SELECT id FROM public.inspection_jobs 
  WHERE assigned_to IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid())
));

-- Create policies for inspection_media
CREATE POLICY "Inspectors can manage media for their jobs" 
ON public.inspection_media 
FOR ALL 
USING (job_id IN (
  SELECT id FROM public.inspection_jobs 
  WHERE assigned_to IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid())
));

-- Create storage bucket for inspection photos
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', true);

-- Create storage policies
CREATE POLICY "Inspectors can upload photos for their jobs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'inspection-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Inspectors can view inspection photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'inspection-photos');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_inspectors_updated_at
  BEFORE UPDATE ON public.inspectors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_jobs_updated_at
  BEFORE UPDATE ON public.inspection_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_steps_updated_at
  BEFORE UPDATE ON public.inspection_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_inspector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.inspectors (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Inspector'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created_inspector
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_inspector();