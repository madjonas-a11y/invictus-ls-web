import { useState } from "react";
import { usePlayers } from "@/hooks/useSupabaseData";
import { useTeams } from "@/hooks/useTeams";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

type PlayerForm = { name: string; position: string; team: string; photo_url: string };
const emptyForm: PlayerForm = { name: "", position: "Player", team: "", photo_url: "" };

const PlayerManager = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { data: players } = usePlayers();
  const { data: teams } = useTeams();
  const qc = useQueryClient();

  const [form, setForm] = useState<PlayerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: t("pm.nameRequired"), variant: "destructive" }); return; }
    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("players").update({ name: form.name.trim(), position: form.position, team: form.team, photo_url: form.photo_url || null }).eq("id", editingId);
        if (error) throw error;
        toast({ title: t("pm.playerUpdated") });
      } else {
        const { error } = await supabase.from("players").insert({ name: form.name.trim(), position: form.position, team: form.team, photo_url: form.photo_url || null });
        if (error) throw error;
        toast({ title: t("pm.playerAdded") });
      }
      qc.invalidateQueries({ queryKey: ["players"] });
      setForm(emptyForm); setEditingId(null); setShowForm(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleEdit = (player: any) => {
    setForm({ name: player.name, position: player.position, team: player.team, photo_url: player.photo_url || "" });
    setEditingId(player.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("pm.deleteConfirm"))) return;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { qc.invalidateQueries({ queryKey: ["players"] }); toast({ title: t("pm.playerDeleted") }); }
  };

  const cancelForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const inputClass = "w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6">
      {showForm ? (
        <div className="card-shine rounded-lg p-6 gold-glow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-foreground">{editingId ? t("pm.editPlayer") : t("pm.addPlayer")}</h2>
            <button onClick={cancelForm} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">{t("pm.name")}</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("pm.namePlaceholder")} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("pm.position")}</label>
              <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputClass}>
                <option value="Player">{t("pm.posPlayer")}</option>
                <option value="Goalkeeper">{t("pm.posGoalkeeper")}</option>
                <option value="Defender">{t("pm.posDefender")}</option>
                <option value="Midfielder">{t("pm.posMidfielder")}</option>
                <option value="Forward">{t("pm.posForward")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("pm.team")}</label>
              <select value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} className={inputClass}>
                <option value="">Select team…</option>
                {teams?.map((tm) => (
                  <option key={tm.id} value={tm.name}>{tm.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("pm.photoUrl")}</label>
              <input type="url" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." className={inputClass} />
            </div>
          </div>
          <button onClick={handleSave} disabled={loading}
            className="mt-6 gold-gradient text-primary-foreground font-display tracking-wider px-6 py-2 rounded text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            <Save size={16} />
            {loading ? t("pm.saving") : editingId ? t("pm.updatePlayer") : t("pm.addPlayer")}
          </button>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="gold-gradient text-primary-foreground font-display tracking-wider px-6 py-2 rounded text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
          <Plus size={16} /> {t("pm.addPlayer")}
        </button>
      )}

      {players && players.length > 0 && (
        <div className="space-y-2">
          {players.map((p) => (
            <div key={p.id} className="bg-secondary/50 rounded p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-display">{p.name.charAt(0)}</div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.position} · {p.team}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(p)} className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(p.id)} className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-secondary"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerManager;
