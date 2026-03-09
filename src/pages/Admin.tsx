import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Shield as ShieldIcon, Users, UserPlus, Swords, Plus, ClipboardList, Calendar, Check } from "lucide-react";
import { useTeams } from "@/hooks/useTeams";
import { Trash2 } from "lucide-react";
import AvatarUpload from "@/components/admin/AvatarUpload";
import TeamsTable from "@/components/admin/TeamsTable";
import PlayersTable from "@/components/admin/PlayersTable";
import MatchesTable from "@/components/admin/MatchesTable";
import MatchManager from "@/components/admin/MatchManager";
import CreateMatchForm from "@/components/admin/CreateMatchForm";
import PlayerManager from "@/components/match-center/PlayerManager";
import AdminGate from "@/components/admin/AdminGate";

const inputClass =
  "w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const btnClass =
  "gold-gradient text-primary-foreground font-display tracking-wider px-6 py-2 rounded text-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50";

type AdminTab = "forms" | "players" | "records";

/* ─── NEXT MATCH FORM ─── */
const NextMatchForm = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [nextMatch, setNextMatch] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch the currently saved date when the component loads
  useEffect(() => {
    const fetchNextMatch = async () => {
      // We use "as any" to tell VS Code to bypass its outdated local dictionary
      const { data } = await supabase.from("settings" as any).select("next_match").eq("id", 1).single() as any;
      if (data?.next_match) {
        // Format the database timestamp so the HTML input can read it
        setNextMatch(new Date(data.next_match).toISOString().slice(0, 16));
      }
    };
    fetchNextMatch();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("settings" as any)
      .update({ next_match: nextMatch ? new Date(nextMatch).toISOString() : null })
      .eq("id", 1);
    
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Next match timer updated!" });
      qc.invalidateQueries({ queryKey: ["settings"] }); 
    }
  };

  return (
    <div className="card-shine rounded-lg p-6 space-y-4 border border-primary/20 bg-primary/5">
      <h2 className="font-display text-lg text-foreground flex items-center gap-2">
        <Calendar size={20} className="text-primary" /> Next Match Countdown
      </h2>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Set the exact date and time for the next match. The timer on the homepage will automatically count down to this moment.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Date & Time</label>
          <input
            type="datetime-local"
            value={nextMatch}
            onChange={(e) => setNextMatch(e.target.value)}
            className={inputClass}
          />
        </div>
        <button onClick={handleSubmit} disabled={loading} className={btnClass}>
          <Check size={16} /> {loading ? "Saving…" : "Set Timer"}
        </button>
      </div>
    </div>
  );
};

/* ─── TEAM FORM ─── */
const TeamForm = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Team name is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("teams").insert({ name: name.trim(), logo_url: logoUrl || null });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team added!" });
      setName("");
      setLogoUrl("");
      qc.invalidateQueries({ queryKey: ["teams"] });
    }
  };

  return (
    <div className="card-shine rounded-lg p-6 space-y-4">
      <h2 className="font-display text-lg text-foreground flex items-center gap-2">
        <Users size={20} className="text-primary" /> Add Team
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Team Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Invictus LS" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Team Logo</label>
          <AvatarUpload
            currentUrl={logoUrl}
            onUploaded={setLogoUrl}
            bucket="team_logos"
            fallbackIcon={<ShieldIcon className="text-muted-foreground" size={24} />}
          />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={loading} className={btnClass}>
        <Plus size={16} /> {loading ? "Saving…" : "Add Team"}
      </button>
    </div>
  );
};

/* ─── PLAYER FORM ─── */
const PlayerForm = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: teams } = useTeams();
  const [form, setForm] = useState({ name: "", position: "Universal", team: "", photo_url: "" });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Player name is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("players").insert({
      name: form.name.trim(),
      position: form.position,
      team: form.team,
      photo_url: avatarUrl || form.photo_url || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Player added!" });
      setForm({ name: "", position: "Universal", team: "", photo_url: "" });
      setAvatarUrl("");
      qc.invalidateQueries({ queryKey: ["players"] });
    }
  };

  return (
    <div className="card-shine rounded-lg p-6 space-y-4">
      <h2 className="font-display text-lg text-foreground flex items-center gap-2">
        <UserPlus size={20} className="text-primary" /> Add Player
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Player name" className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Position</label>
          <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputClass}>
            <option value="Goalkeeper">Goalkeeper</option>
            <option value="Fixo">Fixo</option>
            <option value="Ala">Ala</option>
            <option value="Pivô">Pivô</option>
            <option value="Universal">Universal</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Team</label>
          <select value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} className={inputClass}>
            <option value="">Select team…</option>
            <option value="None">None</option>
            {teams?.map((tm) => (
              <option key={tm.id} value={tm.name}>{tm.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Player Photo</label>
          <AvatarUpload currentUrl={avatarUrl} onUploaded={setAvatarUrl} />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={loading} className={btnClass}>
        <Plus size={16} /> {loading ? "Saving…" : "Add Player"}
      </button>
    </div>
  );
};

/* ─── TAB BUTTON ─── */
const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded font-display text-xs sm:text-sm tracking-wider transition-all ${
      active ? "gold-gradient text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
    }`}
  >
    {icon} {label}
  </button>
);

/* ─── MEDIA GALLERY FORM ─── */
const MediaForm = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", type: "video", url: "", category: "Skills" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.title || !form.url) {
      toast({ title: "Title and URL are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("media_gallery" as any).insert({
      title: form.title,
      media_type: form.type,
      url: form.url,
      category: form.category
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Media added to Fun Zone!" });
      setForm({ title: "", type: "video", url: "", category: "Skills" });
      qc.invalidateQueries({ queryKey: ["media_gallery"] });
    }
  };

  return (
    <div className="card-shine rounded-lg p-6 space-y-4 border border-primary/20 bg-primary/5">
      <h2 className="font-display text-lg text-foreground flex items-center gap-2">
        <Plus size={20} className="text-primary" /> Add to Fun Zone
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Title</label>
          <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. Nutmeg of the Century" className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Media Type</label>
          <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className={inputClass}>
            <option value="video">Video (YouTube/Shorts)</option>
            <option value="audio">Audio (Podcast/Interview)</option>
            <option value="image">Image (Meme/Photo)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Category</label>
          <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className={inputClass}>
            <option value="Skills">Skills & Tricks</option>
            <option value="Bloopers">Bloopers & Fails</option>
            <option value="Locker Room">Locker Room</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">URL (Link)</label>
          <input value={form.url} onChange={(e) => setForm({...form, url: e.target.value})} placeholder="Paste YouTube or Image link here" className={inputClass} />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={loading} className={btnClass}>
        {loading ? "Saving..." : "Add Media"}
      </button>
    </div>
  );
};

/* ─── MEDIA TABLE ─── */
const MediaTable = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  
  const { data: media, isLoading } = useQuery({
    queryKey: ["media_gallery"],
    queryFn: async () => {
      const { data, error } = await supabase.from("media_gallery" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("media_gallery" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Media removed" });
      qc.invalidateQueries({ queryKey: ["media_gallery"] });
    }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading media...</p>;

  return (
    <div className="card-shine rounded-lg p-6 space-y-4">
      <h2 className="font-display text-lg text-foreground flex items-center gap-2">
        <ClipboardList size={20} className="text-primary" /> Manage Fun Zone
      </h2>
      <div className="space-y-2">
        {media?.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded border border-border/50 group">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.category}</span>
            </div>
            <button 
              onClick={() => handleDelete(item.id)}
              className="text-muted-foreground hover:text-destructive transition-colors p-2"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {(!media || media.length === 0) && <p className="text-xs text-muted-foreground italic">No media found.</p>}
      </div>
    </div>
  );
};

/* ─── MAIN ADMIN PAGE ─── */
const Admin = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("forms");

  return (
    <AdminGate>
      <div className="min-h-screen bg-background pt-8 pb-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-8">
          <div className="text-center space-y-2">
            <ShieldIcon size={40} className="mx-auto text-primary" />
            <h1 className="font-display text-3xl tracking-wider gold-text">Superadmin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Your single control room for all admin tasks.</p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 justify-center">
            <TabButton active={activeTab === "forms"} onClick={() => setActiveTab("forms")} icon={<Swords size={16} />} label="Add Data" />
            <TabButton active={activeTab === "players"} onClick={() => setActiveTab("players")} icon={<Users size={16} />} label="Manage Players" />
            <TabButton active={activeTab === "records"} onClick={() => setActiveTab("records")} icon={<ClipboardList size={16} />} label="Records" />
          </div>

          {/* Tab Content */}
          {activeTab === "forms" && (
            <div className="space-y-8">
              <NextMatchForm />
              <MediaForm /> {/* Added this */}
              <TeamForm />
              <TeamsTable />
              <PlayerForm />
              <CreateMatchForm />
              <MatchManager />
            </div>
          )}

          {activeTab === "players" && <PlayerManager />}

          {activeTab === "records" && (
            <div className="space-y-8">
              <MediaTable /> {/* Added this */}
              <TeamsTable />
              <PlayersTable />
              <MatchesTable />
            </div>
          )}
        </div>
      </div>
    </AdminGate>
  );
};



export default Admin;