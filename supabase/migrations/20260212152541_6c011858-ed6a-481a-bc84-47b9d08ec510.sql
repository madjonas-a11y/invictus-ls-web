
-- Players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT,
  position TEXT NOT NULL DEFAULT 'Player',
  team TEXT NOT NULL DEFAULT 'Invictus LS' CHECK (team IN ('Invictus LS', 'Black Team', 'White Team')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opponent TEXT NOT NULL DEFAULT 'Internal',
  score_home INT NOT NULL DEFAULT 0,
  score_away INT NOT NULL DEFAULT 0,
  youtube_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stats table (linked to players and matches)
CREATE TABLE public.stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  goals INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  saves INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, match_id)
);

-- Challenge requests
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  preferred_date DATE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Media gallery
CREATE TABLE public.media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Public read for players, matches, stats, media
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public read stats" ON public.stats FOR SELECT USING (true);
CREATE POLICY "Public read media" ON public.media FOR SELECT USING (true);

-- Anyone can submit a challenge
CREATE POLICY "Anyone can submit challenge" ON public.challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read challenges" ON public.challenges FOR SELECT USING (true);

-- Authenticated users can manage data (admin)
CREATE POLICY "Auth insert players" ON public.players FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update players" ON public.players FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete players" ON public.players FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth insert matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update matches" ON public.matches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete matches" ON public.matches FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth insert stats" ON public.stats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update stats" ON public.stats FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete stats" ON public.stats FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth insert media" ON public.media FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update media" ON public.media FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete media" ON public.media FOR DELETE TO authenticated USING (true);
