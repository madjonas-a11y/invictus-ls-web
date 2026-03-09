import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayers } from "@/hooks/useSupabaseData";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, X, Check, BarChart3 } from "lucide-react";
import AvatarUpload from "@/components/admin/AvatarUpload";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const inputClass =
  "w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

type EditPlayer = { id: string; name: string; position: string; team: string; photo_url: string; games_played: number };
type EditStats = { playerId: string; playerName: string; games_played: number; goals: number; assists: number; saves: number; originalGoals: number; originalAssists: number; originalSaves: number; firstStatId: string | null; firstStatMatchId: string | null };

const PlayersTable = () => {
  const { data: players, isLoading } = usePlayers();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editPlayer, setEditPlayer] = useState<EditPlayer | null>(null);
  const [editStats, setEditStats] = useState<EditStats | null>(null);
  const [saving, setSaving] = useState(false);

  const openStatsModal = async (player: { id: string; name: string; games_played: number }) => {
    // Fetch aggregated stats and first stat row for this player
    const { data: statsRows } = await supabase
      .from("stats")
      .select("*")
      .eq("player_id", player.id)
      .order("created_at", { ascending: true });

    const totals = { goals: 0, assists: 0, saves: 0 };
    statsRows?.forEach((s) => {
      totals.goals += s.goals;
      totals.assists += s.assists;
      totals.saves += s.saves;
    });

    setEditStats({
      playerId: player.id,
      playerName: player.name,
      games_played: player.games_played,
      goals: totals.goals,
      assists: totals.assists,
      saves: totals.saves,
      originalGoals: totals.goals,
      originalAssists: totals.assists,
      originalSaves: totals.saves,
      firstStatId: statsRows?.[0]?.id ?? null,
      firstStatMatchId: statsRows?.[0]?.match_id ?? null,
    });
  };

  const handleStatsSave = async () => {
    if (!editStats) return;
    setSaving(true);
    try {
      // Update games_played on players table
      const { error: pErr } = await supabase
        .from("players")
        .update({ games_played: editStats.games_played })
        .eq("id", editStats.playerId);
      if (pErr) throw pErr;

      // Compute deltas for goals/assists/saves
      const dGoals = editStats.goals - editStats.originalGoals;
      const dAssists = editStats.assists - editStats.originalAssists;
      const dSaves = editStats.saves - editStats.originalSaves;

      if (dGoals !== 0 || dAssists !== 0 || dSaves !== 0) {
        if (editStats.firstStatId) {
          // Fetch the first stat row's current values and add deltas
          const { data: row } = await supabase
            .from("stats")
            .select("goals, assists, saves")
            .eq("id", editStats.firstStatId)
            .single();
          if (row) {
            const { error: sErr } = await supabase
              .from("stats")
              .update({
                goals: row.goals + dGoals,
                assists: row.assists + dAssists,
                saves: row.saves + dSaves,
              })
              .eq("id", editStats.firstStatId);
            if (sErr) throw sErr;
          }
        } else {
          // No stats rows exist — need a match to link to. Get any match or create one.
          let matchId: string;
          const { data: anyMatch } = await supabase.from("matches").select("id").limit(1).single();
          if (anyMatch) {
            matchId = anyMatch.id;
          } else {
            const { data: newMatch, error: mErr } = await supabase
              .from("matches")
              .insert({ opponent: "Manual Adjustment", score_home: 0, score_away: 0 })
              .select("id")
              .single();
            if (mErr || !newMatch) throw mErr || new Error("Failed to create match");
            matchId = newMatch.id;
          }
          const { error: iErr } = await supabase.from("stats").insert({
            player_id: editStats.playerId,
            match_id: matchId,
            goals: editStats.goals,
            assists: editStats.assists,
            saves: editStats.saves,
          });
          if (iErr) throw iErr;
        }
      }

      toast({ title: "Stats updated successfully" });
      setEditStats(null);
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["leaderboards"] });
      qc.invalidateQueries({ queryKey: ["fantasyScores"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Player deleted" });
      qc.invalidateQueries({ queryKey: ["players"] });
    }
  };

  const handleUpdate = async () => {
    if (!editPlayer) return;
    setSaving(true);
    const { error } = await supabase
      .from("players")
      .update({
        name: editPlayer.name,
        position: editPlayer.position,
        team: editPlayer.team,
        photo_url: editPlayer.photo_url || null,
        games_played: editPlayer.games_played,
      })
      .eq("id", editPlayer.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Player updated" });
      setEditPlayer(null);
      qc.invalidateQueries({ queryKey: ["players"] });
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading players…</p>;
  if (!players?.length) return <p className="text-sm text-muted-foreground">No players yet.</p>;

  return (
    <div className="card-shine rounded-lg p-6 space-y-4">
      <h2 className="font-display text-lg text-foreground">Players</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>GP</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-xs">{p.position}</TableCell>
              <TableCell className="text-xs">{p.team}</TableCell>
              <TableCell className="text-xs">{p.games_played}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button onClick={() => openStatsModal(p)} className="text-muted-foreground hover:text-accent" title="Edit Stats">
                    <BarChart3 size={14} />
                  </button>
                  <button onClick={() => setEditPlayer({ id: p.id, name: p.name, position: p.position, team: p.team, photo_url: p.photo_url || "", games_played: p.games_played })} className="text-muted-foreground hover:text-primary">
                    <Pencil size={14} />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{p.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>This will also remove their stats. This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(p.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={!!editPlayer} onOpenChange={(o) => !o && setEditPlayer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Player</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <input value={editPlayer?.name ?? ""} onChange={(e) => setEditPlayer((p) => p && { ...p, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Position</label>
              <select value={editPlayer?.position ?? ""} onChange={(e) => setEditPlayer((p) => p && { ...p, position: e.target.value })} className={inputClass}>
                <option value="Goalkeeper">Goalkeeper</option>
                <option value="Fixo">Fixo</option>
                <option value="Ala">Ala</option>
                <option value="Pivô">Pivô</option>
                <option value="Universal">Universal</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Team</label>
              <select value={editPlayer?.team ?? ""} onChange={(e) => setEditPlayer((p) => p && { ...p, team: e.target.value })} className={inputClass}>
                <option value="Invictus LS">Invictus LS</option>
                <option value="Black Team">Black Team</option>
                <option value="White Team">White Team</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Player Photo</label>
              <AvatarUpload currentUrl={editPlayer?.photo_url ?? ""} onUploaded={(url) => setEditPlayer((p) => p && { ...p, photo_url: url })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Games Played</label>
              <input type="number" min={0} value={editPlayer?.games_played ?? 0} onChange={(e) => setEditPlayer((p) => p && { ...p, games_played: Number(e.target.value) })} className={inputClass} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditPlayer(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"><X size={14} className="inline mr-1" />Cancel</button>
            <button onClick={handleUpdate} disabled={saving} className="gold-gradient text-primary-foreground font-display tracking-wider px-4 py-2 rounded text-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
              <Check size={14} /> {saving ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stats Dialog */}
      <Dialog open={!!editStats} onOpenChange={(o) => !o && setEditStats(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Stats — {editStats?.playerName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Games Played</label>
              <input type="number" min={0} value={editStats?.games_played ?? 0} onChange={(e) => setEditStats((s) => s && { ...s, games_played: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Goals</label>
              <input type="number" min={0} value={editStats?.goals ?? 0} onChange={(e) => setEditStats((s) => s && { ...s, goals: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Assists</label>
              <input type="number" min={0} value={editStats?.assists ?? 0} onChange={(e) => setEditStats((s) => s && { ...s, assists: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Saves</label>
              <input type="number" min={0} value={editStats?.saves ?? 0} onChange={(e) => setEditStats((s) => s && { ...s, saves: Number(e.target.value) })} className={inputClass} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditStats(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"><X size={14} className="inline mr-1" />Cancel</button>
            <button onClick={handleStatsSave} disabled={saving} className="gold-gradient text-primary-foreground font-display tracking-wider px-4 py-2 rounded text-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
              <Check size={14} /> {saving ? "Saving…" : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayersTable;
