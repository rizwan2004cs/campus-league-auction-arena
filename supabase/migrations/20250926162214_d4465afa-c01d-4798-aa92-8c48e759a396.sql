-- Sample data for auction system
-- Insert sample settings (update if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.settings LIMIT 1) THEN
    INSERT INTO public.settings (initial_purse, players_per_team) VALUES (100, 3);
  ELSE
    UPDATE public.settings SET initial_purse = 100, players_per_team = 3 WHERE id = (SELECT id FROM public.settings LIMIT 1);
  END IF;
END $$;

-- Insert sample teams (ignore if exists)
INSERT INTO public.teams (name, purse, points, owner_id) 
VALUES 
  ('Mumbai Indians', 100, 0, (SELECT id FROM auth.users LIMIT 1)),
  ('Chennai Super Kings', 100, 0, (SELECT id FROM auth.users LIMIT 1)),
  ('Royal Challengers Bangalore', 100, 0, (SELECT id FROM auth.users LIMIT 1)),
  ('Kolkata Knight Riders', 100, 0, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (name) DO NOTHING;

-- Insert sample players (ignore if exists)
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
ON CONFLICT (name) DO NOTHING;