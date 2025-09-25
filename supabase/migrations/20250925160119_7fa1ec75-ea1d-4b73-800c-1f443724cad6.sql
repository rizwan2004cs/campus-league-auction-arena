-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create settings table for auction configuration
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  players_per_team INTEGER NOT NULL DEFAULT 2,
  initial_purse NUMERIC NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  purse NUMERIC NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  base_price NUMERIC NOT NULL DEFAULT 1,
  sold_price NUMERIC,
  team_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL
);

-- Create team_players junction table for many-to-many relationship
CREATE TABLE public.team_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  player_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE,
  UNIQUE(team_id, player_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for settings (read-only for all authenticated users)
CREATE POLICY "Settings are viewable by authenticated users" 
ON public.settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Settings can be updated by authenticated users" 
ON public.settings 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for teams
CREATE POLICY "Teams are viewable by everyone" 
ON public.teams 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own teams" 
ON public.teams 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own teams" 
ON public.teams 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own teams" 
ON public.teams 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Create RLS policies for players
CREATE POLICY "Players are viewable by everyone" 
ON public.players 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage players" 
ON public.players 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for team_players
CREATE POLICY "Team players are viewable by everyone" 
ON public.team_players 
FOR SELECT 
USING (true);

CREATE POLICY "Team owners can manage their team players" 
ON public.team_players 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = team_players.team_id 
    AND teams.owner_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default settings
INSERT INTO public.settings (players_per_team, initial_purse) 
VALUES (2, 50);