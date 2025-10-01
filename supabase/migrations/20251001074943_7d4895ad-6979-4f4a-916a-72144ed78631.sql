-- Update RLS policy for team_players to allow authenticated users during auction
DROP POLICY IF EXISTS "Team owners can manage their team players" ON public.team_players;

-- Allow authenticated users to insert players during auction
CREATE POLICY "Authenticated users can add players to teams during auction"
ON public.team_players
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete team players during auction
CREATE POLICY "Authenticated users can remove players from teams during auction"
ON public.team_players
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to update team players during auction
CREATE POLICY "Authenticated users can update team players during auction"
ON public.team_players
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);