-- Fix the security issue with search_path for the handle_new_inspector function
CREATE OR REPLACE FUNCTION public.handle_new_inspector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
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