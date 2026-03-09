import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Trophy, Check, Lock, ArrowLeft, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const VOTE_STORAGE_KEY = "mvp_votes_cast";

const VoteMvp = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [hasVoted, setHasVoted] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const votes = JSON.parse(localStorage.getItem(VOTE_STORAGE_KEY) || "{}");
    if (matchId && votes[matchId]) {
      setHasVoted(true);
    }
  }, [matchId]);

  // Fetch match details
  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)")
        .eq("id", matchId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Fetch players who played in this match via match_logs
  const { data: matchPlayers, isLoading: playersLoading } = useQuery({
    queryKey: ["matchPlayers", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_logs")
        .select("*, player:players(*)")
        .eq("match_id", matchId!);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase.from("mvp_votes").insert({
        match_id: matchId!,
        player_id: playerId,
      });
      if (error) throw error;
      return playerId;
    },
    onSuccess: (playerId) => {
      // Save to localStorage
      const votes = JSON.parse(localStorage.getItem(VOTE_STORAGE_KEY) || "{}");
      votes[matchId!] = playerId;
      localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(votes));
      setHasVoted(true);
      toast({ title: "Vote submitted! 🗳️", description: "Thanks for voting!" });
      qc.invalidateQueries({ queryKey: ["mvpVotes", matchId] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleVote = (playerId: string) => {
    if (hasVoted || (match as any)?.poll_closed) return;
    voteMutation.mutate(playerId);
  };

  const isPollClosed = (match as any)?.poll_closed;
  const isLoading = matchLoading || playersLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Trophy size={48} className="text-muted-foreground" />
        <p className="text-muted-foreground">Match not found</p>
        <Link to="/dashboard" className="text-primary underline text-sm">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <Trophy size={40} className="mx-auto text-primary" />
          <h1 className="font-display text-2xl tracking-wider gold-text">Vote for MVP</h1>
          <p className="text-sm text-muted-foreground">
            {(match as any).home_team?.name ?? "Home"} vs {(match as any).away_team?.name ?? "Away"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(match.match_date).toLocaleDateString()} • {match.score_home} - {match.score_away}
          </p>
        </div>

        {/* Status Banner */}
        {isPollClosed && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-center gap-3 justify-center">
            <Lock size={18} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Voting has closed for this match</span>
          </div>
        )}

        {hasVoted && !isPollClosed && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3 justify-center">
            <Check size={18} className="text-primary" />
            <span className="text-sm text-foreground">You've already voted!</span>
          </div>
        )}

        {/* Player Cards */}
        <div className="space-y-3">
          {matchPlayers?.map((log) => {
            const player = log.player;
            if (!player) return null;

            const isMvp = log.is_mvp;

            return (
              <button
                key={log.id}
                onClick={() => handleVote(player.id)}
                disabled={hasVoted || isPollClosed || voteMutation.isPending}
                className={`w-full text-left card-shine rounded-lg p-4 transition-all ${
                  hasVoted || isPollClosed
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:ring-2 hover:ring-primary/50 cursor-pointer"
                } ${isMvp ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={player.photo_url || ""} alt={player.name} />
                    <AvatarFallback className="bg-secondary">
                      <User size={24} className="text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-foreground truncate">{player.name}</span>
                      {isMvp && <Trophy size={16} className="text-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{player.position}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex gap-3 text-xs">
                      <div className="text-center">
                        <p className="font-bold text-foreground">{log.goals ?? 0}</p>
                        <p className="text-muted-foreground">Goals</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground">{log.assists ?? 0}</p>
                        <p className="text-muted-foreground">Assists</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground">{log.saves ?? 0}</p>
                        <p className="text-muted-foreground">Saves</p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {matchPlayers?.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No players recorded for this match</p>
        )}
      </div>
    </div>
  );
};

export default VoteMvp;
