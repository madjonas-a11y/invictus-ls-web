import { useState } from "react";
import { useTeams } from "@/hooks/useTeams";
import { usePlayers, useFantasyScores } from "@/hooks/useSupabaseData"; // Import BOTH hooks
import { useTranslation } from "@/i18n/useTranslation";
import PlayerCard from "@/components/PlayerCard";
import TeamBadge from "@/components/TeamBadge";
import { Shield, Target, Zap, Waves, Star } from "lucide-react";

const Roster = () => {
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: players, isLoading: playersLoading } = usePlayers();
  const { data: fantasyScores } = useFantasyScores(); // Fetch the points separately
  
  const [activeTeam, setActiveTeam] = useState("All");
  const { t, lang } = useTranslation();

  const isLoading = teamsLoading || playersLoading;

  const filtered = activeTeam === "All"
    ? players
    : players?.filter((p) => p.team === activeTeam);

  const positions = [
    { 
      dbName: "Goalkeeper", 
      displayName: lang === "pt" ? "Guarda-Redes" : "Goalkeepers", 
      icon: <Shield size={18} className="text-primary" /> 
    },
    { 
      dbName: "Fixo", 
      displayName: "Fixos", 
      icon: <Waves size={18} className="text-primary" /> 
    },
    { 
      dbName: "Ala", 
      displayName: "Alas", 
      icon: <Zap size={18} className="text-primary" /> 
    },
    { 
      dbName: "Pivô", 
      displayName: lang === "pt" ? "Pivôs" : "Pivots", 
      icon: <Target size={18} className="text-primary" /> 
    },
    { 
      dbName: "Universal", 
      displayName: lang === "pt" ? "Universais" : "Universals", 
      icon: <Star size={18} className="text-primary" /> 
    }
  ];

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-display gold-text text-center mb-8 uppercase tracking-widest">
          {t("roster.title")}
        </h1>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          <button
            onClick={() => setActiveTeam("All")}
            className={`font-display text-[10px] tracking-[0.2em] px-5 py-2.5 rounded uppercase transition-all ${
              activeTeam === "All" ? "gold-gradient text-primary-foreground shadow-lg" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t("roster.all")}
          </button>
          {teams?.map((team) => (
            <button
              key={team.id}
              onClick={() => setActiveTeam(team.name)}
              className={`font-display text-[10px] tracking-[0.2em] px-5 py-2.5 rounded uppercase transition-all flex items-center gap-2 ${
                activeTeam === team.name ? "gold-gradient text-primary-foreground shadow-lg" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              <TeamBadge logoUrl={team.logo_url} name={team.name} size={14} />
              {team.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground animate-pulse font-display tracking-widest">{t("roster.loading")}</p>
        ) : (
          <div className="space-y-16">
            {positions.map((pos) => {
              const playersInPos = filtered?.filter(p => p.position === pos.dbName);
              
              if (!playersInPos || playersInPos.length === 0) return null;

              return (
                <div key={pos.dbName} className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-primary/20 pb-2">
                    {pos.icon}
                    <h2 className="font-display text-lg tracking-[0.3em] uppercase gold-text">
                      {pos.displayName}
                    </h2>
                    <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                      {playersInPos.length} {lang === "pt" ? "JOGADORES" : "PLAYERS"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {playersInPos.map((player) => {
                      const teamInfo = teams?.find(t => t.name === player.team);
                      
                      // Find the fantasy stats for this specific player
                      const playerStats = fantasyScores?.find(f => f.id === player.id);
                      
                      // Force TypeScript to accept the dynamic shape of playerStats
                      const stats = playerStats as any;

                      const enhancedPlayer = { 
                        ...player, 
                        logo_url: teamInfo?.logo_url,
                        fantasy_score: stats?.fantasy_score || 0,
                        goals: stats?.goals || 0,
                        assists: stats?.assists || 0,
                        saves: stats?.saves || 0,
                        own_goals: stats?.own_goals || 0
                      };
                      
                      return <PlayerCard key={player.id} player={enhancedPlayer} />;
                    })}
                  </div>
                </div>
              );
            })}

            {/* Empty State */}
            {filtered?.length === 0 && (
              <p className="text-center text-muted-foreground py-20 font-display tracking-widest uppercase text-sm">
                {lang === "pt" ? "Nenhum jogador encontrado nesta equipa" : "No players found for this team"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Roster;