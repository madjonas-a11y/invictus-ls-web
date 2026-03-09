import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayers } from "@/hooks/useSupabaseData";
import { useTeams } from "@/hooks/useTeams";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Swords, Plus, Trash2, Check, Calculator, RefreshCcw, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/useTranslation";

const inputClass =
  "w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all";
const btnClass =
  "gold-gradient text-primary-foreground font-display tracking-wider px-6 py-2 rounded text-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50";

type PlayerStat = {
  player_id: string;
  side: "home" | "away";
  goals: number;
  assists: number;
  saves: number;
};

const CreateMatchForm = () => {
  const { toast } = useToast();
  const { lang } = useTranslation();
  const qc = useQueryClient();
  const { data: players } = usePlayers();
  const { data: teams } = useTeams();

  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  // --- AUTO-SCORE LOGIC ---
  useEffect(() => {
    const totalHome = selectedPlayers
      .filter((p) => p.side === "home")
      .reduce((sum, p) => sum + p.goals, 0);
    
    const totalAway = selectedPlayers
      .filter((p) => p.side === "away")
      .reduce((sum, p) => sum + p.goals, 0);

    setScoreHome(totalHome);
    setScoreAway(totalAway);
  }, [selectedPlayers]);

  const resetForm = () => {
    setHomeTeamId("");
    setAwayTeamId("");
    setYoutubeLink("");
    setSelectedPlayers([]);
    setShowAllPlayers(false);
    setMatchDate(new Date().toISOString().slice(0, 10));
    toast({ title: "Form cleared" });
  };

  const assignPlayer = (id: string, side: "home" | "away") => {
    const existing = selectedPlayers.find((p) => p.player_id === id);
    if (existing) {
      if (existing.side === side) {
        setSelectedPlayers(selectedPlayers.filter((p) => p.player_id !== id));
      } else {
        setSelectedPlayers(selectedPlayers.map((p) => (p.player_id === id ? { ...p, side } : p)));
      }
    } else {
      setSelectedPlayers([...selectedPlayers, { player_id: id, side, goals: 0, assists: 0, saves: 0 }]);
    }
  };

  const removePlayer = (id: string) => {
    setSelectedPlayers(selectedPlayers.filter((p) => p.player_id !== id));
  };

  const updateStat = (id: string, field: "goals" | "assists" | "saves", value: number) => {
    setSelectedPlayers(selectedPlayers.map((p) => (p.player_id === id ? { ...p, [field]: value } : p)));
  };

  const getPlayerName = (id: string) => players?.find((p) => p.id === id)?.name ?? id;
  const getTeamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? "";

  const handleSubmit = async () => {
    if (!homeTeamId || !awayTeamId) {
      toast({ title: "Select both teams", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const homeTeam = teams?.find((t) => t.id === homeTeamId);
      const awayTeam = teams?.find((t) => t.id === awayTeamId);

      const { data: match, error: mErr } = await supabase
        .from("matches")
        .insert({
          match_date: matchDate,
          opponent: `${homeTeam?.name ?? "Home"} vs ${awayTeam?.name ?? "Away"}`,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          score_home: scoreHome,
          score_away: scoreAway,
          youtube_link: youtubeLink || null,
        })
        .select().single();
      if (mErr) throw mErr;

      if (selectedPlayers.length > 0) {
        const statsRows = selectedPlayers.map((p) => ({
          match_id: match.id, 
          player_id: p.player_id, 
          goals: p.goals, 
          assists: p.assists, 
          saves: p.saves,
        }));
        await supabase.from("stats").insert(statsRows);

        // --- UPDATED FANTASY LOGIC WITH +5 APPEARANCE POINTS ---
        const appearanceBonus = 5; 
        const winningSide = scoreHome > scoreAway ? "home" : scoreAway > scoreHome ? "away" : "draw";
        
        const playersWithStats = selectedPlayers.map(p => ({
          ...p, 
          // Base score calculation including the appearance bonus
          baseScore: (p.goals * 10) + (p.assists * 5) + (p.saves * 1) + appearanceBonus
        }));

        const maxScore = Math.max(0, ...playersWithStats.map(p => p.baseScore));
        let mvpCandidates = playersWithStats.filter(p => p.baseScore === maxScore && maxScore > 0);
        
        if (mvpCandidates.length > 1 && winningSide !== "draw") {
          const winners = mvpCandidates.filter(p => p.side === winningSide);
          if (winners.length > 0) mvpCandidates = winners;
        }
        mvpCandidates.sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.saves - a.saves);
        const mvpId = mvpCandidates[0]?.player_id || null;

        const logRows = selectedPlayers.map((p) => ({
          match_id: match.id, 
          player_id: p.player_id, 
          team_id: p.side === "home" ? homeTeamId : awayTeamId,
          match_date: matchDate, 
          goals: p.goals, 
          assists: p.assists, 
          saves: p.saves, 
          is_mvp: p.player_id === mvpId,
        }));
        await supabase.from("match_logs").insert(logRows as any);
      }

      toast({ title: "Match recorded successfully!" });
      qc.invalidateQueries();
      resetForm();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderPlayerList = (side: "home" | "away", teamId: string) => {
    const sidePlayers = selectedPlayers.filter((p) => p.side === side);
    const teamName = getTeamName(teamId);

    const displayPlayers = showAllPlayers 
      ? players 
      : players?.filter((p: any) => p.team_id === teamId || p.team === teamName);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <span className="text-primary text-xs">●</span>
            <p className="text-xs font-display tracking-widest uppercase text-foreground">
               {teamName || (side === "home" ? "HOME" : "AWAY")}
            </p>
          </div>
          
          <button 
            onClick={() => setShowAllPlayers(!showAllPlayers)}
            className={cn(
              "text-[9px] px-2 py-1 rounded border transition-all uppercase tracking-tighter flex items-center gap-1",
              showAllPlayers 
                ? "bg-primary/20 border-primary text-primary" 
                : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            <Users size={10} />
            {lang === "pt" ? "Ver todos" : "Show all"}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {displayPlayers?.map((p) => {
            const isSelected = selectedPlayers.find((s) => s.player_id === p.id);
            const isThisSide = isSelected?.side === side;
            return (
              <button
                key={p.id}
                onClick={() => assignPlayer(p.id, side)}
                className={cn(
                  "text-[10px] px-3 py-1 rounded transition-all border uppercase tracking-wider",
                  isThisSide ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20" : 
                  isSelected ? "opacity-20 cursor-not-allowed" : "bg-secondary/40 border-border hover:border-primary/50"
                )}
                disabled={!!isSelected && !isThisSide}
              >
                {p.name}
                {showAllPlayers && p.team && p.team !== teamName && (
                  <span className="ml-1 opacity-50 text-[8px]">({p.team})</span>
                )}
              </button>
            );
          })}
          
          {(!displayPlayers || displayPlayers.length === 0) && (
            <p className="text-[10px] text-muted-foreground italic py-2">
              No players found.
            </p>
          )}
        </div>

        <div className="space-y-2 mt-4">
          {sidePlayers.map((sp) => (
            <div key={sp.player_id} className="bg-secondary/20 rounded-lg p-2 flex items-center gap-4 border border-border/40">
              <span className="text-xs font-medium flex-1 truncate">{getPlayerName(sp.player_id)}</span>
              <div className="flex gap-2">
                {["goals", "assists", "saves"].map((stat) => (
                  <div key={stat} className="flex flex-col items-center">
                    <label className="text-[8px] text-muted-foreground uppercase mb-0.5">{stat[0]}</label>
                    <input 
                      type="number" min={0} 
                      value={(sp as any)[stat]} 
                      onChange={(e) => updateStat(sp.player_id, stat as any, Number(e.target.value))} 
                      className="w-10 bg-background border border-border rounded text-[10px] text-center p-1" 
                    />
                  </div>
                ))}
                <button onClick={() => removePlayer(sp.player_id)} className="text-muted-foreground hover:text-destructive pl-2">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="card-shine rounded-lg p-6 space-y-8 bg-card/30 border border-primary/10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-foreground flex items-center gap-2 tracking-widest uppercase">
          <Swords size={20} className="text-primary" /> Create Match
        </h2>
        <button onClick={resetForm} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 uppercase tracking-tighter transition-colors">
          <RefreshCcw size={12} /> Clear Form
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Match Date</label>
          <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Video Link</label>
          <input value={youtubeLink} onChange={(e) => setYoutubeLink(e.target.value)} placeholder="YouTube URL" className={inputClass} />
        </div>
        
        <div className="space-y-4 p-4 rounded-xl bg-secondary/10 border border-border/50">
          <label className="text-[10px] uppercase tracking-widest text-primary font-bold">Home Selection</label>
          <select value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)} className={inputClass}>
            <option value="">Select Team</option>
            {teams?.map((t) => <option key={t.id} value={t.id} disabled={t.id === awayTeamId}>{t.name}</option>)}
          </select>
          <div className="flex items-center justify-between">
             <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Calculated Score</span>
             <span className="text-2xl font-display gold-text">{scoreHome}</span>
          </div>
        </div>

        <div className="space-y-4 p-4 rounded-xl bg-secondary/10 border border-border/50">
          <label className="text-[10px] uppercase tracking-widest text-foreground font-bold">Away Selection</label>
          <select value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)} className={inputClass}>
            <option value="">Select Team</option>
            {teams?.map((t) => <option key={t.id} value={t.id} disabled={t.id === homeTeamId}>{t.name}</option>)}
          </select>
          <div className="flex items-center justify-between">
             <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Calculated Score</span>
             <span className="text-2xl font-display text-foreground">{scoreAway}</span>
          </div>
        </div>
      </div>

      {homeTeamId && awayTeamId && (
        <div className="grid md:grid-cols-2 gap-8 border-t border-border/50 pt-8 animate-in fade-in slide-in-from-top-4">
          {renderPlayerList("home", homeTeamId)}
          {renderPlayerList("away", awayTeamId)}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading || !homeTeamId || !awayTeamId} className={cn(btnClass, "w-full justify-center py-4")}>
        {loading ? "Processing..." : <><Check size={18} /> Finish & Record Match</>}
      </button>
    </div>
  );
};

export default CreateMatchForm;