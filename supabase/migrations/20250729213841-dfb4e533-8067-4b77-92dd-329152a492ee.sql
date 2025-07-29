-- Create FCM tokens table for Firebase push notifications
CREATE TABLE public.fcm_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Enable Row Level Security
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for FCM tokens
CREATE POLICY "Users can manage their own FCM tokens" 
ON public.fcm_tokens 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE TRIGGER update_fcm_tokens_updated_at
BEFORE UPDATE ON public.fcm_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();