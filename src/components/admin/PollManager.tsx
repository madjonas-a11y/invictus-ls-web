import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link2, Trophy, Lock, ExternalLink } from "lucide-react";
import { useState } from "react";

const PollManager = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Fetch matches with poll status
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matchesWithPolls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)")
        .order("match_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all votes for these matches
  const { data: allVotes } = useQuery({
    queryKey: ["allMvpVotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mvp_votes")
        .select("*, player:players(name, photo_url)");
      if (error) throw error;
      return data;
    },
  });

  // Close poll mutation
  const closePollMutation = useMutation({
    mutationFn: async (matchId: string) => {
      // Get votes for this match
      const matchVotes = allVotes?.filter((v) => v.match_id === matchId) || [];
      
      if (matchVotes.length === 0) {
        throw new Error("No votes to tally");
      }

      // Count votes per player
      const voteCounts: Record<string, number> = {};
      matchVotes.forEach((v) => {
        voteCounts[v.player_id] = (voteCounts[v.player_id] || 0) + 1;
      });

      // Find winner
      const winnerId = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0][0];

      // Update match_logs to crown MVP
      const { error: logErr } = await supabase
        .from("match_logs")
        .update({ is_mvp: true })
        .eq("match_id", matchId)
        .eq("player_id", winnerId);
      if (logErr) throw logErr;

      // Close the poll
      const { error: matchErr } = await supabase
        .from("matches")
        .update({ poll_closed: true })
        .eq("id", matchId);
      if (matchErr) throw matchErr;

      return winnerId;
    },
    onSuccess: () => {
      toast({ title: "MVP crowned! 🏆", description: "The poll has been closed." });
      qc.invalidateQueries({ queryKey: ["matchesWithPolls"] });
      qc.invalidateQueries({ queryKey: ["allMvpVotes"] });
      qc.invalidateQueries({ queryKey: ["matchLogs"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const copyLink = (matchId: string) => {
    const url = `${window.location.origin}/vote/${matchId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied! 📋", description: "Share it on WhatsApp!" });
  };

  const getVoteTally = (matchId: string) => {
    const matchVotes = allVotes?.filter((v) => v.match_id === matchId) || [];
    const counts: Record<string, { name: string; count: number }> = {};
    matchVotes.forEach((v) => {
      const name = (v.player as any)?.name || "Unknown";
      if (!counts[v.player_id]) {
        counts[v.player_id] = { name, count: 0 };
      }
      counts[v.player_id].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading polls...</div>;
  }

  return (
    <div className="card-shine rounded-lg p-6 space-y-4">
      <h2 className="font-display text-lg text-foreground flex items-center gap-2">
        <Trophy size={20} className="text-primary" /> Manage MVP Polls
      </h2>

      <div className="space-y-4">
        {matches?.map((match) => {
          const isPollClosed = (match as any).poll_closed;
          const tally = getVoteTally(match.id);
          const totalVotes = tally.reduce((sum, t) => sum + t.count, 0);

          return (
            <div key={match.id} className="bg-secondary/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {(match as any).home_team?.name ?? "Home"} vs {(match as any).away_team?.name ?? "Away"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(match.match_date).toLocaleDateString()} • {match.score_home} - {match.score_away}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isPollClosed ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock size={12} /> Closed
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => copyLink(match.id)}
                        className="text-xs bg-secondary hover:bg-muted px-3 py-1.5 rounded flex items-center gap-1 text-foreground"
                      >
                        <Link2 size={12} /> Copy Link
                      </button>
                      <a
                        href={`/vote/${match.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-secondary hover:bg-muted px-2 py-1.5 rounded text-foreground"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Vote Tally */}
              {tally.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Vote Tally ({totalVotes} vote{totalVotes !== 1 ? "s" : ""})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tally.slice(0, 5).map((t, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded ${
                          i === 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t.name}: {t.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Poll Button */}
              {!isPollClosed && tally.length > 0 && (
                <button
                  onClick={() => closePollMutation.mutate(match.id)}
                  disabled={closePollMutation.isPending}
                  className="text-xs gold-gradient text-primary-foreground px-4 py-2 rounded font-display tracking-wider flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  <Trophy size={14} />
                  {closePollMutation.isPending ? "Closing..." : "Close Poll & Crown MVP"}
                </button>
              )}

              {tally.length === 0 && !isPollClosed && (
                <p className="text-xs text-muted-foreground">No votes yet</p>
              )}
            </div>
          );
        })}

        {matches?.length === 0 && (
          <p className="text-muted-foreground text-sm">No matches found</p>
        )}
      </div>
    </div>
  );
};

export default PollManager;
