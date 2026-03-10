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
      // We use 'as any' here to bypass the temporary TS restriction on the new column
      const { data, error } = await supabase
        .from("stats")
        .select("goals, assists, saves, own_goals, player:players(id, name)");

      if (error) throw error;
      const stats = data as any[];

      const playerTotals = new Map();

      stats?.forEach((stat) => {
        const playerId = stat.player?.id;
        if (!playerId) return;

        if (!playerTotals.has(playerId)) {
          playerTotals.set(playerId, {
            player: stat.player,
            goals: 0,
            assists: 0,
            saves: 0,
            own_goals: 0,
          });
        }

        const current = playerTotals.get(playerId);
        current.goals += stat.goals || 0;
        current.assists += stat.assists || 0;
        current.saves += stat.saves || 0;
        current.own_goals += stat.own_goals || 0;
      });

      const aggregatedStats = Array.from(playerTotals.values());

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
      
      const stats = data as any[];
      const totals = { goals: 0, assists: 0, saves: 0, own_goals: 0, games: stats?.length || 0 };
      
      stats?.forEach((s) => {
        totals.goals += s.goals || 0;
        totals.assists += s.assists || 0;
        totals.saves += s.saves || 0;
        totals.own_goals += s.own_goals || 0;
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
    mutationFn: async (statsList: any[]) => {
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