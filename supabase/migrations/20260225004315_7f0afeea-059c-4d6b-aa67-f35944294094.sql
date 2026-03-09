CREATE OR REPLACE VIEW public.player_fantasy_scores AS
SELECT
  p.id,
  p.name,
  p.photo_url,
  p.position,
  p.team,
  p.games_played,
  COALESCE(SUM(s.goals), 0)::integer AS goals,
  COALESCE(SUM(s.assists), 0)::integer AS assists,
  COALESCE(SUM(s.saves), 0)::integer AS saves,
  ((p.games_played * 5) + (COALESCE(SUM(s.goals), 0) * 10) + (COALESCE(SUM(s.assists), 0) * 5) + (COALESCE(SUM(s.saves), 0) * 2))::integer AS fantasy_score
FROM public.players p
LEFT JOIN public.stats s ON s.player_id = p.id
GROUP BY p.id, p.name, p.photo_url, p.position, p.team, p.games_played;