import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePlayers = () =>
  useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

export const useMatches = () =>
  useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
          away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
        `)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useLatestMatch = () =>
  useQuery({
    queryKey: ["latestMatch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
          away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
        `)
        .order("match_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useStats = () =>
  useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stats").select("*");
      if (error) throw error;
      return data;
    },
  });

export const useLeaderboards = () => {
  return useQuery({
    queryKey: ["leaderboards"],
    queryFn: async () => {
      // 1. Fetch ALL stats from ALL matches
      const { data: stats, error } = await supabase
        .from("stats")
        .select("goals, assists, saves, player:players(id, name)");

      if (error) throw error;

      // 2. Combine match stats into total season stats per player
      const playerTotals = new Map();

      stats?.forEach((stat: any) => {
        const playerId = stat.player?.id;
        if (!playerId) return; // Skip if no player attached

        if (!playerTotals.has(playerId)) {
          playerTotals.set(playerId, {
            player: stat.player,
            goals: 0,
            assists: 0,
            saves: 0,
          });
        }

        const current = playerTotals.get(playerId);
        current.goals += stat.goals || 0;
        current.assists += stat.assists || 0;
        current.saves += stat.saves || 0;
      });

      // 3. Convert our Map back into a standard array
      const aggregatedStats = Array.from(playerTotals.values());

      // 4. Sort and grab the Top 3 for each specific category
      return {
        topScorers: [...aggregatedStats].sort((a, b) => b.goals - a.goals).slice(0, 3),
        topAssisters: [...aggregatedStats].sort((a, b) => b.assists - a.assists).slice(0, 3),
        topSavers: [...aggregatedStats].sort((a, b) => b.saves - a.saves).slice(0, 3),
      };
    },
  });
};

export const usePlayerStats = (playerId: string | undefined) =>
  useQuery({
    queryKey: ["playerStats", playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stats")
        .select("*")
        .eq("player_id", playerId!);
      if (error) throw error;
      const totals = { goals: 0, assists: 0, saves: 0, games: data?.length || 0 };
      data?.forEach((s) => {
        totals.goals += s.goals;
        totals.assists += s.assists;
        totals.saves += s.saves;
      });
      return totals;
    },
  });

export const useInsertMatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (match: { match_date: string; opponent: string; score_home: number; score_away: number; youtube_link?: string }) => {
      const { data, error } = await supabase.from("matches").insert(match).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
};

export const useInsertStats = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (statsList: { player_id: string; match_id: string; goals: number; assists: number; saves: number }[]) => {
      const { error } = await supabase.from("stats").insert(statsList);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["leaderboards"] });
    },
  });
};

export const useFantasyScores = () =>
  useQuery({
    queryKey: ["fantasyScores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_fantasy_scores")
        .select("*")
        .order("fantasy_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useInsertChallenge = () => {
  return useMutation({
    mutationFn: async (challenge: { team_name: string; contact: string; preferred_date?: string; message?: string }) => {
      const { error } = await supabase.from("challenges").insert(challenge);
      if (error) throw error;
    },
  });
};
