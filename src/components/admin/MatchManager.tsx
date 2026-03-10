import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMatches, usePlayers } from "@/hooks/useSupabaseData";
import { useTeams } from "@/hooks/useTeams";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Check, Plus, Star, Users, Calendar } from "lucide-react";
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
import { cn } from "@/lib/utils";

const inputClass =
  "w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

type MatchLog = {
  id: string;
  player_id: string;
  team_id: string;
  goals: number;
  assists: number;
  saves: number;
  own_goals: number; // AG Support
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
  // Fixed state initialization
  const [newStats, setNewStats] = useState({ goals: 0, assists: 0, saves: 0, own_goals: 0 });

  // Fetch match logs with type-safety fix
  const { data: matchLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["match-logs-edit", editMatch?.id],
    enabled: !!editMatch?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_logs")
        .select("*, player:players(id, name, photo_url)")
        .eq("match_id", editMatch!.id);
      
      if (error) throw error;
      
      // FIXED: Cast to unknown first to avoid the "missing property" error
      return data as unknown as MatchLog[];
    },
  });

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
    setNewStats({ goals: 0, assists: 0, saves: 0, own_goals: 0 });
  };

  const handleCloseEdit = () => {
    setEditMatch(null);
    setEditedLogs({});
  };

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

  const handleSaveStats = async () => {
    setSaving(true);
    try {
      for (const [logId, log] of Object.entries(editedLogs)) {
        await supabase
          .from("match_logs")
          .update({
            goals: log.goals,
            assists: log.assists,
            saves: log.saves,
            own_goals: log.own_goals, 
            is_mvp: log.is_mvp,
          })
          .eq("id", logId);

        await supabase
          .from("stats")
          .update({
            goals: log.goals,
            assists: log.assists,
            saves: log.saves,
            own_goals: log.own_goals,
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

  const handleAddPlayer = async () => {
    if (!newPlayerId || !editMatch) return;
    setSaving(true);
    try {
      const teamId = newPlayerSide === "home" ? editMatch.home_team_id : editMatch.away_team_id;

      await supabase.from("match_logs").insert({
        match_id: editMatch.id,
        player_id: newPlayerId,
        team_id: teamId,
        match_date: editMatch.match_date,
        goals: newStats.goals,
        assists: newStats.assists,
        saves: newStats.saves,
        own_goals: newStats.own_goals,
        is_mvp: false,
      });

      await supabase.from("stats").insert({
        match_id: editMatch.id,
        player_id: newPlayerId,
        goals: newStats.goals,
        assists: newStats.assists,
        saves: newStats.saves,
        own_goals: newStats.own_goals,
      });

      toast({ title: "Player added to match" });
      refetchLogs();
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["leaderboards"] });
      setNewPlayerId("");
      setNewStats({ goals: 0, assists: 0, saves: 0, own_goals: 0 });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!editMatch) return;
    setSaving(true);
    try {
      await supabase.from("stats").delete().eq("match_id", editMatch.id);
      await supabase.from("match_logs").delete().eq("match_id", editMatch.id);
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

  const handleRemovePlayer = async (logId: string, playerId: string) => {
    if (!editMatch) return;
    setSaving(true);
    try {
      await supabase.from("match_logs").delete().eq("id", logId);
      await supabase.from("stats").delete().eq("match_id", editMatch.id).eq("player_id", playerId);
      toast({ title: "Player removed from match" });
      refetchLogs();
      qc.invalidateQueries({ queryKey: ["stats"] });
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

  const availablePlayers = players?.filter(
    (p) => !matchLogs?.some((log) => log.player_id === p.id)
  );

  if (isLoading) return <p className="text-sm text-muted-foreground font-display p-6">Loading matches…</p>;
  if (!matches?.length) return <p className="text-sm text-muted-foreground p-6">No matches yet.</p>;

  const homeLogs = Object.values(editedLogs).filter((l) => l.team_id === editMatch?.home_team_id);
  const awayLogs = Object.values(editedLogs).filter((l) => l.team_id === editMatch?.away_team_id);

  return (
    <div className="card-shine rounded-lg p-6 space-y-4">
      <h2 className="font-display text-lg text-foreground flex items-center gap-2 tracking-widest uppercase">
        <Users size={20} className="text-primary" /> Manage Matches
      </h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="uppercase text-[10px] tracking-widest">Date</TableHead>
            <TableHead className="uppercase text-[10px] tracking-widest">Home</TableHead>
            <TableHead className="text-center uppercase text-[10px] tracking-widest">Score</TableHead>
            <TableHead className="uppercase text-[10px] tracking-widest">Away</TableHead>
            <TableHead className="w-20 uppercase text-[10px] tracking-widest">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((m) => (
            <TableRow key={m.id} className="hover:bg-secondary/20 transition-colors">
              <TableCell className="text-xs font-display">{m.match_date}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <TeamBadge logoUrl={getTeamLogo(m.home_team_id)} name={getTeamName(m.home_team_id)} size={20} />
                  <span className="text-xs font-medium">{getTeamName(m.home_team_id)}</span>
                </div>
              </TableCell>
              <TableCell className="text-center font-display gold-text">{m.score_home} – {m.score_away}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <TeamBadge logoUrl={getTeamLogo(m.away_team_id)} name={getTeamName(m.away_team_id)} size={20} />
                  <span className="text-xs font-medium">{getTeamName(m.away_team_id)}</span>
                </div>
              </TableCell>
              <TableCell>
                <button onClick={() => handleOpenEdit(m)} className="text-muted-foreground hover:text-primary transition-colors">
                  <Pencil size={16} />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editMatch} onOpenChange={(o) => !o && handleCloseEdit()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-card border-primary/20 shadow-2xl">
          <DialogHeader className="p-6 pb-2 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 font-display tracking-widest uppercase text-primary">
              <Pencil size={18} /> Edit Match Details
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-8 py-6">
              {/* Match General Info */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-display tracking-widest text-primary/70 flex items-center gap-2 uppercase">
                  <Calendar size={12} /> Score & Metadata
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 bg-secondary/10 p-4 rounded-lg border border-border/50">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-muted-foreground">Match Date</label>
                    <input type="date" value={editMatch?.match_date ?? ""} onChange={(e) => setEditMatch((p) => p && { ...p, match_date: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-muted-foreground">Highlights URL</label>
                    <input value={editMatch?.youtube_link ?? ""} onChange={(e) => setEditMatch((p) => p && { ...p, youtube_link: e.target.value })} placeholder="https://youtube.com/..." className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-primary">Score ({getTeamName(editMatch?.home_team_id ?? null)})</label>
                    <input type="number" min={0} value={editMatch?.score_home ?? 0} onChange={(e) => setEditMatch((p) => p && { ...p, score_home: Number(e.target.value) })} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-foreground">Score ({getTeamName(editMatch?.away_team_id ?? null)})</label>
                    <input type="number" min={0} value={editMatch?.score_away ?? 0} onChange={(e) => setEditMatch((p) => p && { ...p, score_away: Number(e.target.value) })} className={inputClass} />
                  </div>
                </div>
                <button onClick={handleUpdateMatch} disabled={saving} className="gold-gradient text-primary-foreground font-display tracking-widest px-6 py-2 rounded text-[10px] uppercase hover:opacity-90 flex items-center gap-2 disabled:opacity-50 transition-all">
                  <Check size={14} /> Update Result & Links
                </button>
              </div>

              {/* Player Stats Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-display tracking-widest text-primary/70 flex items-center gap-2 uppercase">
                  <Users size={12} /> Individual Performances
                </h3>

                {!Object.keys(editedLogs).length && matchLogs && (
                  <button onClick={initEditedLogs} className="w-full py-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-[10px] uppercase tracking-widest font-display text-muted-foreground">
                    Click to Load Players for Editing →
                  </button>
                )}

                {Object.keys(editedLogs).length > 0 && (
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold px-2">🏠 {getTeamName(editMatch?.home_team_id ?? null)}</p>
                      <div className="grid gap-2">
                        {homeLogs.map((log) => (
                          <PlayerEditRow key={log.id} log={log} updateLog={updateLog} handleRemove={handleRemovePlayer} />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground font-bold px-2">✈️ {getTeamName(editMatch?.away_team_id ?? null)}</p>
                      <div className="grid gap-2">
                        {awayLogs.map((log) => (
                          <PlayerEditRow key={log.id} log={log} updateLog={updateLog} handleRemove={handleRemovePlayer} />
                        ))}
                      </div>
                    </div>

                    <button onClick={handleSaveStats} disabled={saving} className="gold-gradient text-primary-foreground font-display tracking-widest px-6 py-4 rounded text-[10px] uppercase w-full hover:opacity-90 flex items-center justify-center gap-3 shadow-lg shadow-primary/20 transition-all">
                      <Check size={16} /> Confirm All Player Stats
                    </button>
                  </div>
                )}
              </div>

              {/* Add New Entry */}
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-[10px] font-display tracking-widest text-primary/70 flex items-center gap-2 uppercase">
                  <Plus size={12} /> Register Additional Player
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 bg-secondary/5 p-4 rounded-lg border border-border/50">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-muted-foreground">Player Name</label>
                    <select value={newPlayerId} onChange={(e) => setNewPlayerId(e.target.value)} className={inputClass}>
                      <option value="">Choose...</option>
                      {availablePlayers?.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-muted-foreground">Team Side</label>
                    <select value={newPlayerSide} onChange={(e) => setNewPlayerSide(e.target.value as "home" | "away")} className={inputClass}>
                      <option value="home">Home Side</option>
                      <option value="away">Away Side</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:col-span-2">
                    {[
                      { id: "goals", label: "G" },
                      { id: "assists", label: "A" },
                      { id: "saves", label: "S" },
                      { id: "own_goals", label: "AG" }
                    ].map((s) => (
                      <div key={s.id} className="space-y-1">
                        <label className="text-[8px] uppercase font-bold text-muted-foreground text-center block">{s.label}</label>
                        <input type="number" min={0} value={(newStats as any)[s.id]} onChange={(e) => setNewStats({ ...newStats, [s.id]: Number(e.target.value) })} className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-center" />
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={handleAddPlayer} disabled={saving || !newPlayerId} className="bg-secondary text-foreground font-display tracking-widest px-6 py-2 rounded text-[10px] uppercase hover:bg-secondary/80 flex items-center gap-2 transition-colors border border-border">
                  <Plus size={14} /> Add Player to Match
                </button>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-border pt-6 pb-12 text-center">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-[10px] uppercase tracking-widest text-destructive hover:text-destructive/60 transition-colors font-bold">
                      <Trash2 size={12} className="inline mr-1" /> Delete Entire Match Record
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-destructive/20">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display tracking-widest uppercase">Permanent Deletion?</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm">This will erase the match result, player stats, and fantasy point logs. This action is irreversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="font-display text-[10px] uppercase">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteMatch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-display text-[10px] uppercase">Erase Match</AlertDialogAction>
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

const PlayerEditRow = ({ log, updateLog, handleRemove }: { log: MatchLog, updateLog: any, handleRemove: any }) => (
  <div className="bg-secondary/20 rounded-lg p-3 flex flex-col gap-3 border border-border/40 hover:border-primary/20 transition-all">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {log.is_mvp && <Star size={12} className="text-primary fill-primary" />}
        <span className="text-xs font-bold text-foreground truncate">{log.player?.name}</span>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="text-muted-foreground/40 hover:text-destructive transition-colors"><Trash2 size={12} /></button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-sm uppercase">Remove Player Stats?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">Discarding stats for {log.player?.name} will affect fantasy totals.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[10px] uppercase">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRemove(log.id, log.player_id)} className="text-[10px] uppercase">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    <div className="grid grid-cols-5 gap-2 items-end">
      {[
        { id: "goals", label: "G" },
        { id: "assists", label: "A" },
        { id: "saves", label: "S" },
        { id: "own_goals", label: "AG", color: "text-red-400" }
      ].map((stat) => (
        <div key={stat.id} className="space-y-1">
          <label className={cn("text-[8px] uppercase font-black text-center block", stat.color || "text-muted-foreground/60")}>{stat.label}</label>
          <input type="number" min={0} value={(log as any)[stat.id]} onChange={(e) => updateLog(log.id, stat.id, Number(e.target.value))} className="w-full bg-background border border-border/60 rounded text-[10px] text-center p-1 focus:border-primary transition-all" />
        </div>
      ))}
      <label className="flex flex-col items-center gap-1 mb-1">
        <span className="text-[8px] uppercase text-muted-foreground/60 font-black">MVP</span>
        <input type="checkbox" checked={log.is_mvp} onChange={(e) => updateLog(log.id, "is_mvp", e.target.checked)} className="accent-primary h-3 w-3 cursor-pointer" />
      </label>
    </div>
  </div>
);

export default MatchManager;