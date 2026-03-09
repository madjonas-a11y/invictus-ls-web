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
  own_goals: number; // Integrated AG/OG
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
          own_goals,
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

  const getHomeTeam = (match: any) => {
    if (match.home_team_id) {
      const team = teamMap.get(match.home_team_id);
      return { name: team?.name || "Home", logo: team?.logo_url || null };
    }
    const invictus = teamNameMap.get("Invictus LS");
    return { name: "Invictus LS", logo: invictus?.logo_url || null };
  };

  const getAwayTeam = (match: any) => {
    if (match.away_team_id) {
      const team = teamMap.get(match.away_team_id);
      return { name: team?.name || "Away", logo: team?.logo_url || null };
    }
    return { name: match.opponent || "Away", logo: null };
  };

  // Helper logic for bilingual headers (Added AG/OG)
  const getStatHeader = (stat: "goals" | "assists" | "saves" | "og" | "fp") => {
    if (lang === "pt") {
      switch (stat) {
        case "goals": return "G";
        case "assists": return "A";
        case "saves": return "D";
        case "og": return "AG";
        case "fp": return "PF";
      }
    }
    switch (stat) {
      case "goals": return "G";
      case "assists": return "A";
      case "saves": return "S";
      case "og": return "OG";
      case "fp": return "FP";
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

              return (
                <Collapsible key={match.id} open={isExpanded} onOpenChange={() => toggleExpand(match.id)}>
                  <div className="card-shine rounded-xl overflow-hidden gold-glow bg-card/40 border border-border/50 transition-all duration-300">
                    <CollapsibleTrigger className="w-full text-left group">
                      <div className="p-5 md:p-6 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                            <Calendar size={14} className="text-primary" />
                            {new Date(match.match_date).toLocaleDateString(dateLocale, {
                              weekday: "short", day: "numeric", month: "long", year: "numeric",
                            })}
                          </div>
                          <Badge variant="outline" className="font-display text-xs bg-secondary/50 text-foreground border-border uppercase tracking-widest">
                            {lang === "pt" ? "FIM" : "FT"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-center gap-4 md:gap-8">
                          <div className="flex-1 flex flex-col items-center gap-3 min-w-0">
                            <TeamBadge logoUrl={homeTeam.logo} name={homeTeam.name} size={56} />
                            <p className="text-sm md:text-base text-foreground font-display tracking-wide text-center truncate max-w-full">
                              {homeTeam.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 px-2 shrink-0 bg-background/50 rounded-lg py-2 md:px-6 md:py-3 border border-border/30 shadow-inner">
                            <span className={cn("text-3xl md:text-5xl font-display", match.score_home > match.score_away ? "gold-text" : "text-foreground")}>
                              {match.score_home}
                            </span>
                            <span className="text-muted-foreground text-xl pb-1">-</span>
                            <span className={cn("text-3xl md:text-5xl font-display", match.score_away > match.score_home ? "gold-text" : "text-foreground")}>
                              {match.score_away}
                            </span>
                          </div>
                          <div className="flex-1 flex flex-col items-center gap-3 min-w-0">
                            <TeamBadge logoUrl={awayTeam.logo} name={awayTeam.name} size={56} />
                            <p className="text-sm md:text-base text-foreground font-display tracking-wide text-center truncate max-w-full">
                              {awayTeam.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-border/50 bg-background/80 p-5 md:p-8">
                        {matchLogs && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                            {/* Home Team Column */}
                            <div>
                              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
                                <span className="text-sm font-display text-foreground">{homeTeam.name}</span>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-display tracking-widest w-40 justify-end pr-2">
                                  <span className="w-6 text-center">{getStatHeader("goals")}</span>
                                  <span className="w-6 text-center">{getStatHeader("assists")}</span>
                                  <span className="w-6 text-center">{getStatHeader("og")}</span>
                                  <span className="w-8 text-center text-primary">{getStatHeader("fp")}</span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                {matchLogs.filter(l => l.team_id === match.home_team_id).map(log => (
                                  <PlayerStatRow key={log.id} log={log} />
                                ))}
                              </div>
                            </div>
                            {/* Away Team Column */}
                            <div>
                              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
                                <span className="text-sm font-display text-foreground">{awayTeam.name}</span>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-display tracking-widest w-40 justify-end pr-2">
                                  <span className="w-6 text-center">{getStatHeader("goals")}</span>
                                  <span className="w-6 text-center">{getStatHeader("assists")}</span>
                                  <span className="w-6 text-center">{getStatHeader("og")}</span>
                                  <span className="w-8 text-center text-primary">{getStatHeader("fp")}</span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                {matchLogs.filter(l => l.team_id === match.away_team_id).map(log => (
                                  <PlayerStatRow key={log.id} log={log} />
                                ))}
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

const PlayerStatRow = ({ log }: { log: MatchLog }) => {
  const { lang } = useTranslation();
  const player = log.player;
  const initials = player?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";

  // --- UPDATED FANTASY CALCULATION ---
  const appearanceBonus = 5;
  const baseScore = (log.goals * 10) + (log.assists * 5) + (log.saves * 1) + appearanceBonus - (log.own_goals * 5);
  const mvpBonus = log.is_mvp ? 15 : 0;
  const matchFantasyPoints = baseScore + mvpBonus;

  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-secondary/10 hover:bg-secondary/40 transition-colors border border-transparent">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-8 w-8 border border-border/50 shadow-sm">
          <AvatarImage src={player?.photo_url || undefined} alt={player?.name || "Player"} />
          <AvatarFallback className="text-[10px] bg-background font-display text-muted-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-foreground truncate max-w-[120px] md:max-w-[150px]">
            {player?.name || "Unknown"}
          </span>
          <div className="flex gap-1 mt-0.5">
            {log.is_mvp && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] px-1 py-0 h-4 uppercase tracking-widest font-display">
                <Star size={8} className="mr-1 fill-primary" /> MVP
              </Badge>
            )}
            {log.own_goals > 0 && (
              <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[8px] px-1 py-0 h-4 uppercase tracking-widest font-display">
                {lang === "pt" ? "AG" : "OG"}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 font-display text-sm w-40 justify-end pr-2">
        <span className={cn("w-6 text-center", log.goals > 0 ? "text-foreground font-bold" : "text-muted-foreground/30")}>
          {log.goals}
        </span>
        <span className={cn("w-6 text-center", log.assists > 0 ? "text-foreground font-bold" : "text-muted-foreground/30")}>
          {log.assists}
        </span>
        <span className={cn("w-6 text-center", log.own_goals > 0 ? "text-red-500 font-bold" : "text-muted-foreground/30")}>
          {log.own_goals}
        </span>
        <span className="w-8 text-center gold-text font-bold">
          {matchFantasyPoints}
        </span>
      </div>
    </div>
  );
};

export default MatchHistory;