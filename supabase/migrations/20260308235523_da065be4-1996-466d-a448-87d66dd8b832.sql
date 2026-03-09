ALTER TABLE public.match_logs 
ADD COLUMN match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE;