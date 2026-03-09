import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeams } from "@/hooks/useTeams";
import { useTranslation } from "@/i18n/useTranslation";
import { Calendar, Youtube, ChevronDown, Star, Activity } from "lucide-react";
import TeamBadge from "@/components/TeamBadge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface MatchLog {
  id: string;
  player_id: string;
  goals: number;
  assists: number;
  saves: number;
  is_mvp: boolean;
  team_id: string | null;
  player: {
    id: string;
    name: string;
    photo_url: string | null;
  } | null;
}

const MatchHistory = () => {
  const { t, lang } = useTranslation();
  const { data: teams } = useTeams();
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const teamMap = new Map(teams?.map((tm) => [tm.id, tm]) || []);
  const teamNameMap = new Map(teams?.map((tm) => [tm.name, tm]) || []);
  const dateLocale = lang === "pt" ? "pt-PT" : "en-GB";

  // Fetch all matches
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch match_logs for the expanded match
  const { data: matchLogs } = useQuery({
    queryKey: ["match-logs", expandedMatch],
    enabled: !!expandedMatch,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_logs")
        .select(`
          id,
          player_id,
          goals,
          assists,
          saves,
          is_mvp,
          team_id,
          player:players!match_logs_player_id_fkey (
            id,
            name,
            photo_url
          )
        `)
        .eq("match_id", expandedMatch!);
      if (error) throw error;
      return data as unknown as MatchLog[];
    },
  });

  const toggleExpand = (matchId: string) => {
    setExpandedMatch(expandedMatch === matchId ? null : matchId);
  };

  const getHomeTeam = (match: typeof matches[0]) => {
    if (match.home_team_id) {
      const team = teamMap.get(match.home_team_id);
      return { name: team?.name || "Home", logo: team?.logo_url || null };
    }
    const invictus = teamNameMap.get("Invictus LS");
    return { name: "Invictus LS", logo: invictus?.logo_url || null };
  };

  const getAwayTeam = (match: typeof matches[0]) => {
    if (match.away_team_id) {
      const team = teamMap.get(match.away_team_id);
      return { name: team?.name || "Away", logo: team?.logo_url || null };
    }
    const opponentTeam = teamNameMap.get(match.opponent);
    return { name: match.opponent || "Away", logo: opponentTeam?.logo_url || null };
  };

  const getPlayersByTeam = (logs: MatchLog[], match: typeof matches[0]) => {
    const homeTeamId = match.home_team_id;
    const awayTeamId = match.away_team_id;
    
    const homePlayers = logs.filter(log => log.team_id === homeTeamId);
    const awayPlayers = logs.filter(log => log.team_id === awayTeamId);
    
    if (homePlayers.length === 0 && awayPlayers.length === 0) {
      return { home: logs, away: [] };
    }
    
    return { home: homePlayers, away: awayPlayers };
  };

  // Helper logic for bilingual headers
  const getStatHeader = (stat: "goals" | "assists" | "saves" | "fp") => {
    if (lang === "pt") {
      switch (stat) {
        case "goals": return "G";
        case "assists": return "A";
        case "saves": return "D"; // Defesas
        case "fp": return "PF"; // Pontos Fantasy
      }
    }
    switch (stat) {
      case "goals": return "G";
      case "assists": return "A";
      case "saves": return "S"; // Saves
      case "fp": return "FP"; // Fantasy Points
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-display gold-text text-center mb-2">
          {t("history.title")}
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-10 font-display tracking-widest uppercase">
          {t("history.allResults")}
        </p>

        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-20 flex flex-col items-center gap-3">
            <Activity className="animate-pulse text-primary" size={32} />
            {t("history.loading")}
          </div>
        ) : !matches?.length ? (
          <div className="text-center text-muted-foreground text-sm py-20">
            {t("history.noMatches")}
          </div>
        ) : (
          <div className="space-y-5">
            {matches.map((match) => {
              const homeTeam = getHomeTeam(match);
              const awayTeam = getAwayTeam(match);
              const isExpanded = expandedMatch === match.id;
              const playersByTeam = matchLogs && isExpanded ? getPlayersByTeam(matchLogs, match) : null;

              return (
                <Collapsible key={match.id} open={isExpanded} onOpenChange={() => toggleExpand(match.id)}>
                  <div className="card-shine rounded-xl overflow-hidden gold-glow bg-card/40 border border-border/50 transition-all duration-300">
                    {/* Card Header - Clickable */}
                    <CollapsibleTrigger className="w-full text-left group">
                      <div className="p-5 md:p-6 hover:bg-secondary/20 transition-colors">
                        {/* Date and FT/FIM Badge */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                            <Calendar size={14} className="text-primary" />
                            {new Date(match.match_date).toLocaleDateString(dateLocale, {
                              weekday: "short", day: "numeric", month: "long", year: "numeric",
                            })}
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-display text-xs bg-secondary/50 text-foreground border-border uppercase tracking-widest">
                              {lang === "pt" ? "FIM" : "FT"}
                            </Badge>
                            <ChevronDown
                              size={18}
                              className={cn(
                                "text-muted-foreground transition-transform duration-300 group-hover:text-primary",
                                isExpanded && "rotate-180 text-primary"
                              )}
                            />
                          </div>
                        </div>

                        {/* Teams and Score */}
                        <div className="flex items-center justify-center gap-4 md:gap-8">
                          {/* Home Team */}
                          <div className="flex-1 flex flex-col items-center gap-3 min-w-0">
                            <TeamBadge logoUrl={homeTeam.logo} name={homeTeam.name} size={56} />
                            <p className="text-sm md:text-base text-foreground font-display tracking-wide text-center truncate max-w-full">
                              {homeTeam.name}
                            </p>
                          </div>

                          {/* Score */}
                          <div className="flex items-center gap-3 px-2 shrink-0 bg-background/50 rounded-lg py-2 md:px-6 md:py-3 border border-border/30 shadow-inner">
                            <span className={cn("text-3xl md:text-5xl font-display", match.score_home > match.score_away ? "gold-text" : "text-foreground")}>
                              {match.score_home}
                            </span>
                            <span className="text-muted-foreground text-xl pb-1">-</span>
                            <span className={cn("text-3xl md:text-5xl font-display", match.score_away > match.score_home ? "gold-text" : "text-foreground")}>
                              {match.score_away}
                            </span>
                          </div>

                          {/* Away Team */}
                          <div className="flex-1 flex flex-col items-center gap-3 min-w-0">
                            <TeamBadge logoUrl={awayTeam.logo} name={awayTeam.name} size={56} />
                            <p className="text-sm md:text-base text-foreground font-display tracking-wide text-center truncate max-w-full">
                              {awayTeam.name}
                            </p>
                          </div>
                        </div>

                        {/* YouTube Link */}
                        {match.youtube_link && (
                          <div className="mt-6 flex justify-center">
                            <a
                              href={match.youtube_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 text-xs font-medium text-white bg-red-600/90 hover:bg-red-600 px-4 py-2 rounded-full transition-colors shadow-lg shadow-red-900/20"
                            >
                              <Youtube size={16} />
                              {lang === "pt" ? "Ver Resumo" : "Watch Highlights"}
                            </a>
                          </div>
                        )}
                      </div>
                    </CollapsibleTrigger>

                    {/* Expanded Box Score */}
                    <CollapsibleContent>
                      <div className="border-t border-border/50 bg-background/80 p-5 md:p-8">
                        <div className="flex items-center justify-center gap-2 mb-6">
                          <Activity size={16} className="text-primary" />
                          <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase">
                            {lang === "pt" ? "Estatísticas do Jogo" : "Match Box Score"}
                          </h3>
                        </div>

                        {!matchLogs || matchLogs.length === 0 ? (
                          <div className="text-center py-8 bg-secondary/20 rounded-lg border border-border/50">
                            <p className="text-sm text-muted-foreground">
                              {lang === "pt" ? "Nenhuma estatística registada." : "No player stats recorded for this match."}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                            {/* Home Team Column */}
                            <div>
                              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                  <TeamBadge logoUrl={homeTeam.logo} name={homeTeam.name} size={24} />
                                  <span className="text-sm font-display text-foreground">{homeTeam.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-display tracking-widest w-32 justify-end pr-2">
                                  <span title={lang === "pt" ? "Golos" : "Goals"} className="w-6 text-center">{getStatHeader("goals")}</span>
                                  <span title={lang === "pt" ? "Assistências" : "Assists"} className="w-6 text-center">{getStatHeader("assists")}</span>
                                  <span title={lang === "pt" ? "Defesas" : "Saves"} className="w-6 text-center">{getStatHeader("saves")}</span>
                                  <span title={lang === "pt" ? "Pontos Fantasy" : "Fantasy Points"} className="w-8 text-center text-primary">{getStatHeader("fp")}</span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                {playersByTeam?.home.map((log) => (
                                  <PlayerStatRow key={log.id} log={log} />
                                ))}
                                {playersByTeam?.home.length === 0 && (
                                  <p className="text-xs text-muted-foreground py-2 italic text-center">
                                    {lang === "pt" ? "Nenhum jogador registado" : "No players logged"}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Away Team Column */}
                            <div>
                              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                  <TeamBadge logoUrl={awayTeam.logo} name={awayTeam.name} size={24} />
                                  <span className="text-sm font-display text-foreground">{awayTeam.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-display tracking-widest w-32 justify-end pr-2">
                                  <span title={lang === "pt" ? "Golos" : "Goals"} className="w-6 text-center">{getStatHeader("goals")}</span>
                                  <span title={lang === "pt" ? "Assistências" : "Assists"} className="w-6 text-center">{getStatHeader("assists")}</span>
                                  <span title={lang === "pt" ? "Defesas" : "Saves"} className="w-6 text-center">{getStatHeader("saves")}</span>
                                  <span title={lang === "pt" ? "Pontos Fantasy" : "Fantasy Points"} className="w-8 text-center text-primary">{getStatHeader("fp")}</span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                {playersByTeam?.away.map((log) => (
                                  <PlayerStatRow key={log.id} log={log} />
                                ))}
                                {playersByTeam?.away.length === 0 && (
                                  <p className="text-xs text-muted-foreground py-2 italic text-center">
                                    {lang === "pt" ? "Nenhum jogador registado" : "No players logged"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Polished Player Stat Row Component
const PlayerStatRow = ({ log }: { log: MatchLog }) => {
  const player = log.player;
  const initials = player?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

  // Calculate Fantasy Points strictly for this specific match display
  // UPDATED: Added +5 Appearance Bonus to the display logic
  const appearanceBonus = 5; 
  const baseScore = (log.goals * 10) + (log.assists * 5) + (log.saves * 1) + appearanceBonus;
  
  const mvpBonus = log.is_mvp ? 15 : 0;
  const playmakerBonus = (log.goals >= 3 && log.assists >= 1) ? 10 : 0;
  const brickWallBonus = log.saves > 35 ? 10 : 0;
  const matchFantasyPoints = baseScore + mvpBonus + playmakerBonus + brickWallBonus;

  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-secondary/10 hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/50">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-8 w-8 border border-border/50 shadow-sm">
          <AvatarImage src={player?.photo_url || undefined} alt={player?.name || "Player"} />
          <AvatarFallback className="text-[10px] bg-background font-display text-muted-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-foreground truncate max-w-[120px] md:max-w-[150px]">
            {player?.name || "Unknown"}
          </span>
          {log.is_mvp && (
            <div className="flex items-center mt-0.5">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1 py-0 h-4 uppercase tracking-widest font-display">
                <Star size={8} className="mr-1 fill-primary" /> MVP
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      {/* Box Score Numbers */}
      <div className="flex items-center gap-3 font-display text-sm w-32 justify-end pr-2">
        <span className={cn("w-6 text-center", log.goals > 0 ? "text-foreground font-bold" : "text-muted-foreground/30")}>
          {log.goals}
        </span>
        <span className={cn("w-6 text-center", log.assists > 0 ? "text-foreground font-bold" : "text-muted-foreground/30")}>
          {log.assists}
        </span>
        <span className={cn("w-6 text-center", log.saves > 0 ? "text-foreground font-bold" : "text-muted-foreground/30")}>
          {log.saves}
        </span>
        <span className="w-8 text-center gold-text font-bold">
          {matchFantasyPoints}
        </span>
      </div>
    </div>
  );
};

export default MatchHistory;