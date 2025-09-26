-- Add missing columns to teams table
ALTER TABLE public.teams ADD COLUMN points numeric NOT NULL DEFAULT 0;

-- Add missing columns to players table  
ALTER TABLE public.players ADD COLUMN points numeric NOT NULL DEFAULT 0;
ALTER TABLE public.players ADD COLUMN priority integer NOT NULL DEFAULT 1;

-- Create a computed column for sold status (derived from team_id)
-- We'll handle 'sold', 'sold_to', 'bid_price' in the application layer