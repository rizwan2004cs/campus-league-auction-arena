-- Sample data for auction system
-- This file contains sample players and teams to help test the system

-- Insert sample settings
INSERT INTO public.settings (initial_purse, players_per_team) 
VALUES (100, 3) 
ON CONFLICT DO NOTHING;

-- Insert sample teams (update if they already exist)
INSERT INTO public.teams (id, name, purse, points, owner_id) 
VALUES 
  (gen_random_uuid(), 'Mumbai Indians', 100, 0, '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'Chennai Super Kings', 100, 0, '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'Royal Challengers Bangalore', 100, 0, '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'Kolkata Knight Riders', 100, 0, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO UPDATE SET 
  purse = EXCLUDED.purse,
  points = EXCLUDED.points;

-- Insert sample players
INSERT INTO public.players (name, category, priority, base_price, points, sold, sold_to, team_id, sold_price) 
VALUES 
  -- Bowlers
  ('Jasprit Bumrah', 'Bowler', 1, 15, 95, false, null, null, null),
  ('Trent Boult', 'Bowler', 2, 12, 88, false, null, null, null),
  ('Kagiso Rabada', 'Bowler', 3, 11, 85, false, null, null, null),
  ('Mohammad Shami', 'Bowler', 4, 10, 82, false, null, null, null),
  ('Yuzvendra Chahal', 'Bowler', 5, 9, 78, false, null, null, null),
  ('Rashid Khan', 'Bowler', 6, 14, 92, false, null, null, null),
  
  -- Batters
  ('Virat Kohli', 'Batter', 7, 17, 98, false, null, null, null),
  ('Rohit Sharma', 'Batter', 8, 16, 96, false, null, null, null),
  ('KL Rahul', 'Batter', 9, 14, 90, false, null, null, null),
  ('Shikhar Dhawan', 'Batter', 10, 12, 85, false, null, null, null),
  ('Shreyas Iyer', 'Batter', 11, 10, 80, false, null, null, null),
  ('Quinton de Kock', 'Batter', 12, 11, 83, false, null, null, null),
  
  -- All-Rounders
  ('Hardik Pandya', 'All-Rounder', 13, 16, 94, false, null, null, null),
  ('Andre Russell', 'All-Rounder', 14, 13, 89, false, null, null, null),
  ('Ben Stokes', 'All-Rounder', 15, 15, 93, false, null, null, null),
  ('Ravindra Jadeja', 'All-Rounder', 16, 12, 87, false, null, null, null),
  ('Glenn Maxwell', 'All-Rounder', 17, 11, 84, false, null, null, null),
  ('Marcus Stoinis', 'All-Rounder', 18, 9, 79, false, null, null, null)
ON CONFLICT (name) DO UPDATE SET 
  category = EXCLUDED.category,
  priority = EXCLUDED.priority,
  base_price = EXCLUDED.base_price,
  points = EXCLUDED.points,
  sold = EXCLUDED.sold,
  sold_to = EXCLUDED.sold_to,
  team_id = EXCLUDED.team_id,
  sold_price = EXCLUDED.sold_price;