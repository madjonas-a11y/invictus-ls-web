import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMatches, usePlayers } from "@/hooks/useSupabaseData";
import { useTeams } from "@/hooks/useTeams";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, X, Check, Plus, Star, Users, Calendar, Youtube } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import TeamBadge from "@/components/TeamBadge";

const inputClass =
  "w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

type MatchLog = {
  id: string;
  player_id: string;
  team_id: string;
  goals: number;
  assists: number;
  saves: number;
  is_mvp: boolean;
  player?: { id: string; name: string; photo_url: string | null };
};

type EditMatch = {
  id: string;
  match_date: string;
  opponent: string;
  score_home: number;
  score_away: number;
  youtube_link: string;
  home_team_id: string | null;
  away_team_id: string | null;
};

const MatchManager = () => {
  const { data: matches, isLoading } = useMatches();
  const { data: players } = usePlayers();
  const { data: teams } = useTeams();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editMatch, setEditMatch] = useState<EditMatch | null>(null);
  const [saving, setSaving] = useState(false);
  const [editedLogs, setEditedLogs] = useState<Record<string, MatchLog>>({});
  const [newPlayerSide, setNewPlayerSide] = useState<"home" | "away">("home");
  const [newPlayerId, setNewPlayerId] = useState("");
  const [newStats, setNewStats] = useState({ goals: 0, assists: 0, saves: 0 });

  // Fetch match logs when editing
  const { data: matchLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["match-logs-edit", editMatch?.id],
    enabled: !!editMatch?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_logs")
        .select("*, player:players(id, name, photo_url)")
        .eq("match_id", editMatch!.id);
      if (error) throw error;
      return data as MatchLog[];
    },
  });

  // Initialize edited logs when matchLogs changes
  const initEditedLogs = () => {
    if (matchLogs) {
      const initial: Record<string, MatchLog> = {};
      matchLogs.forEach((log) => {
        initial[log.id] = { ...log };
      });
      setEditedLogs(initial);
    }
  };

  const getTeamName = (id: string | null) => teams?.find((t) => t.id === id)?.name ?? "Unknown";
  const getTeamLogo = (id: string | null) => teams?.find((t) => t.id === id)?.logo_url ?? null;

  const handleOpenEdit = (m: any) => {
    setEditMatch({
      id: m.id,
      match_date: m.match_date,
      opponent: m.opponent,
      score_home: m.score_home,
      score_away: m.score_away,
      youtube_link: m.youtube_link || "",
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
    });
    setEditedLogs({});
    setNewPlayerId("");
    setNewStats({ goals: 0, assists: 0, saves: 0 });
  };

  const handleCloseEdit = () => {
    setEditMatch(null);
    setEditedLogs({});
  };

  // Update match details
  const handleUpdateMatch = async () => {
    if (!editMatch) return;
    setSaving(true);
    const { error } = await supabase
      .from("matches")
      .update({
        match_date: editMatch.match_date,
        opponent: editMatch.opponent,
        score_home: editMatch.score_home,
        score_away: editMatch.score_away,
        youtube_link: editMatch.youtube_link || null,
        home_team_id: editMatch.home_team_id,
        away_team_id: editMatch.away_team_id,
      })
      .eq("id", editMatch.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Match details updated" });
      qc.invalidateQueries({ queryKey: ["matches"] });
    }
  };

  // Save all edited stats
  const handleSaveStats = async () => {
    setSaving(true);
    try {
      for (const [logId, log] of Object.entries(editedLogs)) {
        // Update match_logs
        await supabase
          .from("match_logs")
          .update({
            goals: log.goals,
            assists: log.assists,
            saves: log.saves,
            is_mvp: log.is_mvp,
          })
          .eq("id", logId);

        // Also update corresponding stats record
        await supabase
          .from("stats")
          .update({
            goals: log.goals,
            assists: log.assists,
            saves: log.saves,
          })
          .eq("match_id", editMatch!.id)
          .eq("player_id", log.player_id);
      }

      toast({ title: "Player stats updated" });
      refetchLogs();
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["leaderboards"] });
      qc.invalidateQueries({ queryKey: ["fantasyScores"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Add new player to match
  const handleAddPlayer = async () => {
    if (!newPlayerId || !editMatch) return;
    setSaving(true);
    try {
      const teamId = newPlayerSide === "home" ? editMatch.home_team_id : editMatch.away_team_id;

      // Insert into match_logs
      await supabase.from("match_logs").insert({
        match_id: editMatch.id,
        player_id: newPlayerId,
        team_id: teamId,
        match_date: editMatch.match_date,
        goals: newStats.goals,
        assists: newStats.assists,
        saves: newStats.saves,
        is_mvp: false,
      });

      // Insert into stats
      await supabase.from("stats").insert({
        match_id: editMatch.id,
        player_id: newPlayerId,
        goals: newStats.goals,
        assists: newStats.assists,
        saves: newStats.saves,
      });

      // Update games_played
      const player = players?.find((p) => p.id === newPlayerId);
      if (player) {
        await supabase
          .from("players")
          .update({ games_played: (player.games_played || 0) + 1 })
          .eq("id", newPlayerId);
      }

      toast({ title: "Player added to match" });
      refetchLogs();
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["leaderboards"] });
      setNewPlayerId("");
      setNewStats({ goals: 0, assists: 0, saves: 0 });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Delete entire match
  const handleDeleteMatch = async () => {
    if (!editMatch) return;
    setSaving(true);
    try {
      // Delete stats
      await supabase.from("stats").delete().eq("match_id", editMatch.id);
      // Delete match_logs
      await supabase.from("match_logs").delete().eq("match_id", editMatch.id);
      // Delete mvp_votes
      await supabase.from("mvp_votes").delete().eq("match_id", editMatch.id);
      // Delete match
      await supabase.from("matches").delete().eq("id", editMatch.id);

      toast({ title: "Match deleted" });
      handleCloseEdit();
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["leaderboards"] });
      qc.invalidateQueries({ queryKey: ["fantasyScores"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Remove single player from match
  const handleRemovePlayer = async (logId: string, playerId: string) => {
    if (!editMatch) return;
    setSaving(true);
    try {
      await supabase.from("match_logs").delete().eq("id", logId);
      await supabase.from("stats").delete().eq("match_id", editMatch.id).eq("player_id", playerId);
      
      // Decrement games_played
      const player = players?.find((p) => p.id === playerId);
      if (player && player.games_played > 0) {
        await supabase
          .from("players")
          .update({ games_played: player.games_played - 1 })
          .eq("id", playerId);
      }

      toast({ title: "Player removed from match" });
      refetchLogs();
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["leaderboards"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateLog = (logId: string, field: keyof MatchLog, value: any) => {
    setEditedLogs((prev) => ({
      ...prev,
      [logId]: { ...prev[logId], [field]: value },
    }));
  };

  // Get players not already in match
  const availablePlayers = players?.filter(
    (p) => !matchLogs?.some((log) => log.player_id === p.id)
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading matches…</p>;
  if (!matches?.length) return <p className="text-sm text-muted-foreground">No matches yet.</p>;

  const homeLogs = Object.values(editedLogs).filter((l) => l.team_id === editMatch?.home_team_id);
  const awayLogs = Object.values(editedLogs).filter((l) => l.team_id === editMatch?.away_team_id);

  return (
    <div className="card-shine rounded-lg p-6 space-y-4">
      <h2 className="font-display text-lg text-foreground flex items-center gap-2">
        <Users size={20} className="text-primary" /> Manage Matches
      </h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Home</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead>Away</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-xs">{m.match_date}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <TeamBadge logoUrl={getTeamLogo(m.home_team_id)} name={getTeamName(m.home_team_id)} size={20} />
                  <span className="text-xs">{getTeamName(m.home_team_id)}</span>
                </div>
              </TableCell>
              <TableCell className="text-center font-bold">{m.score_home} – {m.score_away}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <TeamBadge logoUrl={getTeamLogo(m.away_team_id)} name={getTeamName(m.away_team_id)} size={20} />
                  <span className="text-xs">{getTeamName(m.away_team_id)}</span>
                </div>
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleOpenEdit(m)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Pencil size={16} />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={!!editMatch} onOpenChange={(o) => !o && handleCloseEdit()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={18} /> Edit Match
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Step 1: Match Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-display tracking-wider text-primary flex items-center gap-2">
                  <Calendar size={14} /> Match Details
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Date</label>
                    <input
                      type="date"
                      value={editMatch?.match_date ?? ""}
                      onChange={(e) => setEditMatch((p) => p && { ...p, match_date: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">YouTube Link</label>
                    <input
                      value={editMatch?.youtube_link ?? ""}
                      onChange={(e) => setEditMatch((p) => p && { ...p, youtube_link: e.target.value })}
                      placeholder="https://youtube.com/..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Home Team</label>
                    <select
                      value={editMatch?.home_team_id ?? ""}
                      onChange={(e) => setEditMatch((p) => p && { ...p, home_team_id: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Select…</option>
                      {teams?.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Away Team</label>
                    <select
                      value={editMatch?.away_team_id ?? ""}
                      onChange={(e) => setEditMatch((p) => p && { ...p, away_team_id: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Select…</option>
                      {teams?.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Score (Home)</label>
                    <input
                      type="number"
                      min={0}
                      value={editMatch?.score_home ?? 0}
                      onChange={(e) => setEditMatch((p) => p && { ...p, score_home: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Score (Away)</label>
                    <input
                      type="number"
                      min={0}
                      value={editMatch?.score_away ?? 0}
                      onChange={(e) => setEditMatch((p) => p && { ...p, score_away: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  onClick={handleUpdateMatch}
                  disabled={saving}
                  className="gold-gradient text-primary-foreground font-display tracking-wider px-4 py-2 rounded text-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                >
                  <Check size={14} /> Save Match Details
                </button>
              </div>

              {/* Step 2: Player Stats */}
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-sm font-display tracking-wider text-primary flex items-center gap-2">
                  <Users size={14} /> Player Stats
                </h3>

                {!Object.keys(editedLogs).length && matchLogs && (
                  <button
                    onClick={initEditedLogs}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Load player stats for editing →
                  </button>
                )}

                {Object.keys(editedLogs).length > 0 && (
                  <div className="space-y-4">
                    {/* Home Team */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-display tracking-wider">
                        🏠 {getTeamName(editMatch?.home_team_id ?? null)}
                      </p>
                      {homeLogs.length === 0 && (
                        <p className="text-xs text-muted-foreground/60 italic">No players logged for home team</p>
                      )}
                      {homeLogs.map((log) => (
                        <div key={log.id} className="bg-secondary/50 rounded p-3 flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            {log.is_mvp && <Star size={14} className="text-primary fill-primary" />}
                            <span className="text-sm font-medium">{log.player?.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] text-muted-foreground">Goals</label>
                            <input
                              type="number"
                              min={0}
                              value={log.goals}
                              onChange={(e) => updateLog(log.id, "goals", Number(e.target.value))}
                              className="w-14 bg-background border border-border rounded px-2 py-1 text-xs text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] text-muted-foreground">Assists</label>
                            <input
                              type="number"
                              min={0}
                              value={log.assists}
                              onChange={(e) => updateLog(log.id, "assists", Number(e.target.value))}
                              className="w-14 bg-background border border-border rounded px-2 py-1 text-xs text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] text-muted-foreground">Saves</label>
                            <input
                              type="number"
                              min={0}
                              value={log.saves}
                              onChange={(e) => updateLog(log.id, "saves", Number(e.target.value))}
                              className="w-14 bg-background border border-border rounded px-2 py-1 text-xs text-center"
                            />
                          </div>
                          <label className="flex items-center gap-1 ml-2">
                            <input
                              type="checkbox"
                              checked={log.is_mvp}
                              onChange={(e) => updateLog(log.id, "is_mvp", e.target.checked)}
                              className="accent-primary"
                            />
                            <span className="text-[10px] text-muted-foreground">MVP</span>
                          </label>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="text-muted-foreground hover:text-destructive ml-auto">
                                <Trash2 size={14} />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {log.player?.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove this player's stats from this match.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemovePlayer(log.id, log.player_id)}>
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>

                    {/* Away Team */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-display tracking-wider">
                        ✈️ {getTeamName(editMatch?.away_team_id ?? null)}
                      </p>
                      {awayLogs.length === 0 && (
                        <p className="text-xs text-muted-foreground/60 italic">No players logged for away team</p>
                      )}
                      {awayLogs.map((log) => (
                        <div key={log.id} className="bg-secondary/50 rounded p-3 flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            {log.is_mvp && <Star size={14} className="text-primary fill-primary" />}
                            <span className="text-sm font-medium">{log.player?.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] text-muted-foreground">Goals</label>
                            <input
                              type="number"
                              min={0}
                              value={log.goals}
                              onChange={(e) => updateLog(log.id, "goals", Number(e.target.value))}
                              className="w-14 bg-background border border-border rounded px-2 py-1 text-xs text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] text-muted-foreground">Assists</label>
                            <input
                              type="number"
                              min={0}
                              value={log.assists}
                              onChange={(e) => updateLog(log.id, "assists", Number(e.target.value))}
                              className="w-14 bg-background border border-border rounded px-2 py-1 text-xs text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] text-muted-foreground">Saves</label>
                            <input
                              type="number"
                              min={0}
                              value={log.saves}
                              onChange={(e) => updateLog(log.id, "saves", Number(e.target.value))}
                              className="w-14 bg-background border border-border rounded px-2 py-1 text-xs text-center"
                            />
                          </div>
                          <label className="flex items-center gap-1 ml-2">
                            <input
                              type="checkbox"
                              checked={log.is_mvp}
                              onChange={(e) => updateLog(log.id, "is_mvp", e.target.checked)}
                              className="accent-primary"
                            />
                            <span className="text-[10px] text-muted-foreground">MVP</span>
                          </label>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="text-muted-foreground hover:text-destructive ml-auto">
                                <Trash2 size={14} />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {log.player?.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove this player's stats from this match.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemovePlayer(log.id, log.player_id)}>
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleSaveStats}
                      disabled={saving}
                      className="gold-gradient text-primary-foreground font-display tracking-wider px-4 py-2 rounded text-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Check size={14} /> Save All Stats
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Add Missing Player */}
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-sm font-display tracking-wider text-primary flex items-center gap-2">
                  <Plus size={14} /> Add Missing Player
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Player</label>
                    <select
                      value={newPlayerId}
                      onChange={(e) => setNewPlayerId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select player…</option>
                      {availablePlayers?.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Side</label>
                    <select
                      value={newPlayerSide}
                      onChange={(e) => setNewPlayerSide(e.target.value as "home" | "away")}
                      className={inputClass}
                    >
                      <option value="home">Home - {getTeamName(editMatch?.home_team_id ?? null)}</option>
                      <option value="away">Away - {getTeamName(editMatch?.away_team_id ?? null)}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Goals</label>
                    <input
                      type="number"
                      min={0}
                      value={newStats.goals}
                      onChange={(e) => setNewStats({ ...newStats, goals: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Assists</label>
                    <input
                      type="number"
                      min={0}
                      value={newStats.assists}
                      onChange={(e) => setNewStats({ ...newStats, assists: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Saves</label>
                    <input
                      type="number"
                      min={0}
                      value={newStats.saves}
                      onChange={(e) => setNewStats({ ...newStats, saves: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddPlayer}
                  disabled={saving || !newPlayerId}
                  className="bg-secondary text-foreground font-display tracking-wider px-4 py-2 rounded text-sm hover:bg-secondary/80 flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus size={14} /> Add Player to Match
                </button>
              </div>

              {/* Delete Match */}
              <div className="border-t border-border pt-6">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="bg-destructive/10 text-destructive border border-destructive/30 font-display tracking-wider px-4 py-2 rounded text-sm hover:bg-destructive/20 flex items-center gap-2">
                      <Trash2 size={14} /> Delete Entire Match
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this match?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the match and all associated player stats, logs, and MVP votes. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteMatch}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Match
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchManager;
