import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMatches } from "@/hooks/useSupabaseData";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, X, Check } from "lucide-react";
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

type EditMatch = { id: string; match_date: string; opponent: string; score_home: number; score_away: number; youtube_link: string };

const MatchesTable = () => {
  const { data: matches, isLoading } = useMatches();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editMatch, setEditMatch] = useState<EditMatch | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDelete = async (id: string) => {
    // Delete associated stats first, then the match
    await supabase.from("stats").delete().eq("match_id", id);
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Match deleted" });
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["leaderboards"] });
      qc.invalidateQueries({ queryKey: ["fantasyScores"] });
    }
  };

  const handleUpdate = async () => {
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
      })
      .eq("id", editMatch.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Match updated" });
      setEditMatch(null);
      qc.invalidateQueries({ queryKey: ["matches"] });
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading matches…</p>;
  if (!matches?.length) return <p className="text-sm text-muted-foreground">No matches yet.</p>;

  return (
    <div className="card-shine rounded-lg p-6 space-y-4">
      <h2 className="font-display text-lg text-foreground">Match History</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Opponent</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-xs">{m.match_date}</TableCell>
              <TableCell className="font-medium">{m.opponent}</TableCell>
              <TableCell className="text-xs">{m.score_home} – {m.score_away}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button onClick={() => setEditMatch({ id: m.id, match_date: m.match_date, opponent: m.opponent, score_home: m.score_home, score_away: m.score_away, youtube_link: m.youtube_link || "" })} className="text-muted-foreground hover:text-primary">
                    <Pencil size={14} />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete match vs {m.opponent}?</AlertDialogTitle>
                        <AlertDialogDescription>This will also delete all player stats for this match. This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(m.id)}>Delete</AlertDialogAction>
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
      <Dialog open={!!editMatch} onOpenChange={(o) => !o && setEditMatch(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Match</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Date</label>
              <input type="date" value={editMatch?.match_date ?? ""} onChange={(e) => setEditMatch((p) => p && { ...p, match_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Opponent</label>
              <input value={editMatch?.opponent ?? ""} onChange={(e) => setEditMatch((p) => p && { ...p, opponent: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Score (Home)</label>
                <input type="number" min={0} value={editMatch?.score_home ?? 0} onChange={(e) => setEditMatch((p) => p && { ...p, score_home: Number(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Score (Away)</label>
                <input type="number" min={0} value={editMatch?.score_away ?? 0} onChange={(e) => setEditMatch((p) => p && { ...p, score_away: Number(e.target.value) })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">YouTube Link</label>
              <input value={editMatch?.youtube_link ?? ""} onChange={(e) => setEditMatch((p) => p && { ...p, youtube_link: e.target.value })} className={inputClass} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditMatch(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"><X size={14} className="inline mr-1" />Cancel</button>
            <button onClick={handleUpdate} disabled={saving} className="gold-gradient text-primary-foreground font-display tracking-wider px-4 py-2 rounded text-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
              <Check size={14} /> {saving ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchesTable;
