
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Auth insert teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update teams" ON public.teams FOR UPDATE USING (true);
CREATE POLICY "Auth delete teams" ON public.teams FOR DELETE USING (true);
