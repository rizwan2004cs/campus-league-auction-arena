-- Add image_url column for player images
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS image_url text;

-- Ensure bucket note (no change executed here, bucket already exists and is public as per config)
-- This migration focuses solely on schema to store image URLs.