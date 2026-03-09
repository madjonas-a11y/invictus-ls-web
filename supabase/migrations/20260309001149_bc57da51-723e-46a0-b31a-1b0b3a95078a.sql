
-- Create mvp_votes table
CREATE TABLE public.mvp_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add poll_closed flag to matches
ALTER TABLE public.matches ADD COLUMN poll_closed BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS on mvp_votes
ALTER TABLE public.mvp_votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read mvp_votes (public poll results)
CREATE POLICY "Public read mvp_votes" ON public.mvp_votes FOR SELECT USING (true);

-- Allow anyone to insert votes (public voting)
CREATE POLICY "Public insert mvp_votes" ON public.mvp_votes FOR INSERT WITH CHECK (true);
