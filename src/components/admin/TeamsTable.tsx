import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTeams } from "@/hooks/useTeams";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, X, Check, Shield } from "lucide-react";
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

const TeamsTable = () => {
  const { data: teams, isLoading } = useTeams();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editTeam, setEditTeam] = useState<{ id: string; name: string; logo_url: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDelete = async (id: string, teamName: string) => {
    // Reassign players from this team to "Unassigned"
    const { error: playerErr } = await supabase
      .from("players")
      .update({ team: "Unassigned" })
      .eq("team", teamName);
    if (playerErr) {
      toast({ title: "Error reassigning players", description: playerErr.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Team deleted", description: "Players reassigned to Unassigned." });
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["players"] });
    }
  };

  const handleUpdate = async () => {
    if (!editTeam) return;
    setSaving(true);
    const { error } = await supabase
      .from("teams")
      .update({ name: editTeam.name, logo_url: editTeam.logo_url || null })
      .eq("id", editTeam.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Team updated" });
      setEditTeam(null);
      qc.invalidateQueries({ queryKey: ["teams"] });
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading teams…</p>;
  if (!teams?.length) return <p className="text-sm text-muted-foreground">No teams yet.</p>;

  return (
    <div className="card-shine rounded-lg p-6 space-y-4">
      <h2 className="font-display text-lg text-foreground">Teams</h2>
      <Table>
        <TableHeader>
          <TableRow>
             <TableHead>Logo</TableHead>
             <TableHead>Name</TableHead>
             <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex items-center justify-center border border-border">
                  {t.logo_url ? (
                    <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <Shield size={14} className="text-muted-foreground" />
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button onClick={() => setEditTeam({ id: t.id, name: t.name, logo_url: t.logo_url || "" })} className="text-muted-foreground hover:text-primary">
                    <Pencil size={14} />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{t.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(t.id, t.name)}>Delete</AlertDialogAction>
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
      <Dialog open={!!editTeam} onOpenChange={(o) => !o && setEditTeam(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Team</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <input value={editTeam?.name ?? ""} onChange={(e) => setEditTeam((p) => p && { ...p, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Team Logo</label>
              <AvatarUpload
                currentUrl={editTeam?.logo_url ?? ""}
                onUploaded={(url) => setEditTeam((p) => p && { ...p, logo_url: url })}
                bucket="team_logos"
                fallbackIcon={<Shield className="text-muted-foreground" size={24} />}
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditTeam(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"><X size={14} className="inline mr-1" />Cancel</button>
            <button onClick={handleUpdate} disabled={saving} className="gold-gradient text-primary-foreground font-display tracking-wider px-4 py-2 rounded text-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
              <Check size={14} /> {saving ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamsTable;
