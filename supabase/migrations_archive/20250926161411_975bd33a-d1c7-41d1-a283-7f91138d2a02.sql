-- Add bid_price column to team_players table
ALTER TABLE public.team_players 
ADD COLUMN bid_price numeric;

-- Add sold column to track if player is sold
ALTER TABLE public.players 
ADD COLUMN sold boolean DEFAULT false;

-- Add sold_to column to track which team bought the player
ALTER TABLE public.players 
ADD COLUMN sold_to uuid REFERENCES public.teams(id);

-- Create storage bucket for player images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('player-images', 'player-images', true);

-- Create storage policies for player images
CREATE POLICY "Player images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'player-images');

CREATE POLICY "Authenticated users can upload player images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'player-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update player images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'player-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete player images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'player-images' AND auth.uid() IS NOT NULL);