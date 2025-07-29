-- Create negotiation table to track offers and counter-offers
CREATE TABLE public.negotiation_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  business_id UUID NOT NULL,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('initial', 'counter_admin', 'counter_user')),
  offered_by TEXT NOT NULL CHECK (offered_by IN ('inspector', 'admin')),
  offered_by_user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'superseded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.negotiation_offers ENABLE ROW LEVEL SECURITY;

-- Create policies for negotiation offers
CREATE POLICY "Users can view offers in their business" 
ON public.negotiation_offers 
FOR SELECT 
USING (business_id IN (
  SELECT i.business_id 
  FROM inspectors i 
  WHERE i.user_id = auth.uid()
));

CREATE POLICY "Users can insert offers in their business" 
ON public.negotiation_offers 
FOR INSERT 
WITH CHECK (business_id IN (
  SELECT i.business_id 
  FROM inspectors i 
  WHERE i.user_id = auth.uid()
));

CREATE POLICY "Users can update offers in their business" 
ON public.negotiation_offers 
FOR UPDATE 
USING (business_id IN (
  SELECT i.business_id 
  FROM inspectors i 
  WHERE i.user_id = auth.uid()
));

-- Add negotiation status to inspection_jobs
ALTER TABLE public.inspection_jobs 
ADD COLUMN negotiation_status TEXT DEFAULT 'not_started' CHECK (negotiation_status IN ('not_started', 'pending_admin', 'pending_user', 'agreed', 'declined'));

-- Add final agreed price to inspection_jobs
ALTER TABLE public.inspection_jobs 
ADD COLUMN final_agreed_price DECIMAL(10,2);

-- Create trigger for updated_at on negotiation_offers
CREATE TRIGGER update_negotiation_offers_updated_at
BEFORE UPDATE ON public.negotiation_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();