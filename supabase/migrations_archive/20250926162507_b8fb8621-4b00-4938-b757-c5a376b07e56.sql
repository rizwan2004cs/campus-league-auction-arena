-- Fix RLS policies to allow authenticated users to update teams during auction
-- This is needed because the auction system requires updating team purses

-- Drop the existing restrictive team update policy
DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;

-- Create a more permissive policy for authenticated users during auction
CREATE POLICY "Authenticated users can update teams during auction" 
ON public.teams 
FOR UPDATE 
TO authenticated 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- Also allow authenticated users to update players during auction  
DROP POLICY IF EXISTS "Authenticated users can manage players" ON public.players;

CREATE POLICY "Authenticated users can manage players during auction" 
ON public.players 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix team ownership - update all teams to have a valid owner_id when user logs in
-- For now, let's create a function to set team ownership
CREATE OR REPLACE FUNCTION public.set_team_ownership_for_user(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.teams 
  SET owner_id = user_id 
  WHERE owner_id = '00000000-0000-0000-0000-000000000001' OR owner_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;