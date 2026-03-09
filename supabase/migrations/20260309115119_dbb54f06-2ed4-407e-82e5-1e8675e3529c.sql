CREATE OR REPLACE VIEW public.player_fantasy_scores AS
SELECT
  p.id,
  p.name,
  p.photo_url,
  p.position,
  p.team,
  p.games_played,
  COALESCE(SUM(ml.goals), 0)::integer AS goals,
  COALESCE(SUM(ml.assists), 0)::integer AS assists,
  COALESCE(SUM(ml.saves), 0)::integer AS saves,
  COALESCE(SUM(
    ml.goals * 10 + ml.assists * 5 + ml.saves * 1
    + CASE WHEN ml.is_mvp THEN 15 ELSE 0 END
    + CASE WHEN ml.goals >= 3 AND ml.assists >= 1 THEN 10 ELSE 0 END
    + CASE WHEN ml.saves > 35 THEN 10 ELSE 0 END
  ), 0)::integer AS fantasy_score
FROM players p
LEFT JOIN match_logs ml ON ml.player_id = p.id
GROUP BY p.id, p.name, p.photo_url, p.position, p.team, p.games_played;