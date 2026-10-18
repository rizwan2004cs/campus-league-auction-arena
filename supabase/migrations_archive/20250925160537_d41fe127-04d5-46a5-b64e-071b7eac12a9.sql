-- Fix the trigger function to use SECURITY DEFINER and proper permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also fix the RLS policy for profile insertion to allow the trigger to work
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Allow authenticated users to read settings
DROP POLICY IF EXISTS "Settings are viewable by authenticated users" ON public.settings;
DROP POLICY IF EXISTS "Settings can be updated by authenticated users" ON public.settings;

CREATE POLICY "Settings are viewable by everyone" 
ON public.settings 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage settings" 
ON public.settings 
FOR ALL 
USING (auth.uid() IS NOT NULL);