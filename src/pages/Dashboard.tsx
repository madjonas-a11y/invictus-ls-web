import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/logo-clean.png";
import { useLatestMatch, useLeaderboards } from "@/hooks/useSupabaseData";
import { Trophy, Target, Shield, Star, Loader2, ChevronDown } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import TeamBadge from "@/components/TeamBadge";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { data: latestMatch, isLoading: matchLoading } = useLatestMatch();
  const { data: leaderboards } = useLeaderboards();
  const { t, lang } = useTranslation();
  
  // State for League Standings
  const [standings, setStandings] = useState<any[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(true);

  // State for the Real Timer
  const [countdown, setCountdown] = useState("");
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  // Fetch ALL logs for the latest match (Scorers + MVP)
  const { data: latestLogs } = useQuery({
    queryKey: ["latest-match-logs", latestMatch?.id],
    enabled: !!latestMatch?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_logs")
        .select("id, goals, assists, saves, is_mvp, team_id, player:players(name, photo_url)")
        .eq("match_id", latestMatch!.id);
      if (error) throw error;
      return data;
    }
  });

  const homeScorers = latestLogs?.filter(l => l.team_id === latestMatch?.home_team_id && l.goals > 0) || [];
  const awayScorers = latestLogs?.filter(l => l.team_id === latestMatch?.away_team_id && l.goals > 0) || [];
  const mvpLog = latestLogs?.find(l => l.is_mvp);

  // 1. Fetch the exact date you saved in the Admin panel
  useEffect(() => {
    const fetchNextMatch = async () => {
      try {
        const { data } = await supabase.from("settings" as any).select("next_match").eq("id", 1).single() as any;
        if (data?.next_match) {
          setTargetDate(new Date(data.next_match));
        }
      } catch (error) {
        console.error("No timer set yet", error);
      }
    };
    fetchNextMatch();
  }, []);
  
  // 2. Run the countdown based on that fetched date
  useEffect(() => {
    if (!targetDate) {
      setCountdown(lang === "pt" ? "A Definir" : "TBA");
      return;
    }

    const tick = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) { 
        setCountdown(t("dash.gameDay")); 
        return; 
      }
      
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
    };
    
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate, t, lang]);

  // Fetch and calculate League Standings
  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const { data: matches, error } = await supabase
          .from('matches')
          .select(`
            score_home,
            score_away,
            home_team:teams!home_team_id(id, name, logo_url),
            away_team:teams!away_team_id(id, name, logo_url)
          `)
          .not('score_home', 'is', null)
          .not('score_away', 'is', null);

        if (error) throw error;

        const standingsMap = new Map();

        const initTeam = (team: any) => {
          if (!team || standingsMap.has(team.id)) return;
          standingsMap.set(team.id, {
            id: team.id,
            name: team.name,
            logo_url: team.logo_url,
            played: 0, won: 0, drawn: 0, lost: 0,
            gf: 0, ga: 0, gd: 0, points: 0
          });
        };

        matches?.forEach(m => {
          if (!m.home_team || !m.away_team) return;
          initTeam(m.home_team);
          initTeam(m.away_team);

          const home = standingsMap.get(m.home_team.id);
          const away = standingsMap.get(m.away_team.id);

          home.played += 1;
          away.played += 1;
          home.gf += m.score_home;
          home.ga += m.score_away;
          away.gf += m.score_away;
          away.ga += m.score_home;

          if (m.score_home > m.score_away) {
            home.won += 1; home.points += 3;
            away.lost += 1;
          } else if (m.score_home < m.score_away) {
            away.won += 1; away.points += 3;
            home.lost += 1;
          } else {
            home.drawn += 1; home.points += 1;
            away.drawn += 1; away.points += 1;
          }

          home.gd = home.gf - home.ga;
          away.gd = away.gf - away.ga;
        });

        const sortedStandings = Array.from(standingsMap.values()).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        });

        setStandings(sortedStandings);
      } catch (error) {
        console.error("Error fetching standings:", error);
      } finally {
        setStandingsLoading(false);
      }
    };

    fetchStandings();
  }, []);

  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const dateLocale = lang === "pt" ? "pt-PT" : "en-GB";

  return (
    <div className="min-h-screen pt-16">
      {/* Refined Hero with just Logo and Countdown */}
      <section className="relative flex flex-col items-center justify-center py-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <img src={logo} alt="Invictus LS" className="w-24 h-24 md:w-32 md:h-32 mb-6 animate-slide-up drop-shadow-2xl relative z-10 rounded-full object-contain" />
        <div className="card-shine rounded-lg px-8 py-4 text-center gold-glow relative z-10 bg-background/40 border border-primary/20">
          <p className="text-[10px] text-muted-foreground font-display tracking-[0.3em] mb-1 uppercase">{t("dash.nextMatch")}</p>
          <p className="text-xl md:text-2xl font-display gold-text animate-pulse-gold tracking-widest">{countdown}</p>
        </div>
      </section>

      {/* Latest Result */}
      <section className="container mx-auto px-4 pb-12">
        <h2 className="text-2xl font-display gold-text mb-6 text-center tracking-widest uppercase text-sm">{t("dash.latestResult")}</h2>
        {matchLoading ? (
          <div className="card-shine rounded-lg p-6 max-w-2xl mx-auto flex justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : latestMatch ? (
          <div className="card-shine rounded-lg p-6 md:p-8 max-w-2xl mx-auto gold-glow">
            <div className="flex items-start justify-center gap-4 md:gap-8 mb-4">
              <div className="flex-1 text-center flex flex-col items-center gap-2">
                <TeamBadge logoUrl={latestMatch.home_team?.logo_url ?? null} name={latestMatch.home_team?.name ?? "Home"} size={48} />
                <p className="font-display text-base md:text-lg text-foreground">{latestMatch.home_team?.name ?? "Home"}</p>
                <p className="text-4xl md:text-5xl font-display gold-text">{latestMatch.score_home}</p>
              </div>
              <span className="text-muted-foreground font-display text-xl mt-8">VS</span>
              <div className="flex-1 text-center flex flex-col items-center gap-2">
                <TeamBadge logoUrl={latestMatch.away_team?.logo_url ?? null} name={latestMatch.away_team?.name ?? "Away"} size={48} />
                <p className="font-display text-base md:text-lg text-foreground">{latestMatch.away_team?.name ?? "Away"}</p>
                <p className="text-4xl md:text-5xl font-display text-foreground">{latestMatch.score_away}</p>
              </div>
            </div>

            {/* Goal Scorers Section */}
            {(homeScorers.length > 0 || awayScorers.length > 0) && (
              <div className="flex justify-between w-full max-w-sm mx-auto px-2 mb-6 border-t border-border/30 pt-4">
                <div className="flex-1 text-left space-y-1">
                  {homeScorers.map(s => (
                    <div key={s.id} className="text-xs text-muted-foreground flex items-center justify-start gap-1.5">
                      <span className="truncate max-w-[100px] md:max-w-[130px]">{s.player?.name}</span> 
                      {s.goals > 1 && <span className="text-[10px] text-primary font-bold">x{s.goals}</span>}
                      <span className="text-[10px]">⚽</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 text-right space-y-1">
                  {awayScorers.map(s => (
                    <div key={s.id} className="text-xs text-muted-foreground flex items-center justify-end gap-1.5">
                      <span className="text-[10px]">⚽</span>
                      {s.goals > 1 && <span className="text-[10px] text-primary font-bold">x{s.goals}</span>}
                      <span className="truncate max-w-[100px] md:max-w-[130px]">{s.player?.name}</span> 
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MVP Inline Banner */}
            {mvpLog && (
              <div className="mt-6 mb-8 py-4 flex flex-col items-center justify-center bg-gradient-to-r from-transparent via-primary/10 to-transparent border-y border-primary/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 animate-pulse-gold pointer-events-none" />
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <Star className="text-primary fill-primary" size={12} />
                  <span className="text-[10px] font-display tracking-[0.2em] text-primary uppercase">
                    {lang === "pt" ? "Homem do Jogo" : "Player of the Match"}
                  </span>
                  <Star className="text-primary fill-primary" size={12} />
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  {mvpLog.player?.photo_url ? (
                    <img src={mvpLog.player.photo_url} alt={mvpLog.player.name} className="w-12 h-12 rounded-full border border-primary/50 object-cover shadow-lg shadow-primary/20" />
                  ) : (
                    <div className="w-12 h-12 rounded-full border border-primary/50 bg-background flex items-center justify-center text-sm font-display text-muted-foreground shadow-lg shadow-primary/20">
                      {mvpLog.player?.name?.substring(0, 2).toUpperCase() || "??"}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-bold text-foreground font-display tracking-wide">{mvpLog.player?.name}</p>
                    <div className="flex gap-3 text-[10px] text-muted-foreground font-display mt-0.5">
                      <span className={mvpLog.goals > 0 ? "text-foreground font-bold" : ""}>{mvpLog.goals} G</span>
                      <span className={mvpLog.assists > 0 ? "text-foreground font-bold" : ""}>{mvpLog.assists} A</span>
                      <span className={mvpLog.saves > 0 ? "text-foreground font-bold" : ""}>{mvpLog.saves} S</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mb-4 uppercase tracking-widest">
              {new Date(latestMatch.match_date).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
            </p>
            {latestMatch.youtube_link && getYoutubeEmbedUrl(latestMatch.youtube_link) && (
              <div className="aspect-video rounded-md overflow-hidden border border-border shadow-lg">
                <iframe src={getYoutubeEmbedUrl(latestMatch.youtube_link)!} className="w-full h-full" allowFullScreen title={t("dash.matchVideo")} />
              </div>
            )}
          </div>
        ) : (
          <div className="card-shine rounded-lg p-6 max-w-2xl mx-auto text-center">
            <p className="text-muted-foreground text-sm">No matches have been played yet</p>
          </div>
        )}
      </section>

      {/* League Standings */}
      <section className="container mx-auto px-4 pb-12">
        <h2 className="text-2xl font-display gold-text mb-6 text-center tracking-widest uppercase text-sm">
          {lang === "pt" ? "Classificação" : "League Standings"}
        </h2>
        <div className="card-shine rounded-lg gold-glow overflow-hidden max-w-3xl mx-auto">
          {standingsLoading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-display tracking-wider text-xs">
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">{lang === "pt" ? "Equipa" : "Team"}</th>
                    <th className="text-center px-2 py-3" title="Played">P</th>
                    <th className="text-center px-2 py-3" title="Won">W</th>
                    <th className="text-center px-2 py-3" title="Drawn">D</th>
                    <th className="text-center px-2 py-3" title="Lost">L</th>
                    <th className="text-center px-2 py-3" title="Goal Difference">GD</th>
                    <th className="text-center px-4 py-3 font-bold text-primary" title="Points">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, i) => (
                    <tr key={team.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className={`px-4 py-3 font-display ${i === 0 ? "gold-text" : "text-muted-foreground"}`}>{i + 1}</td>
                      <td className="px-4 py-3 text-foreground font-medium flex items-center gap-2">
                        <TeamBadge logoUrl={team.logo_url} name={team.name} size={24} />
                        {team.name}
                      </td>
                      <td className="text-center px-2 py-3 text-muted-foreground">{team.played}</td>
                      <td className="text-center px-2 py-3 text-muted-foreground">{team.won}</td>
                      <td className="text-center px-2 py-3 text-muted-foreground">{team.drawn}</td>
                      <td className="text-center px-2 py-3 text-muted-foreground">{team.lost}</td>
                      <td className="text-center px-2 py-3 text-muted-foreground">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                      <td className="text-center px-4 py-3 font-display text-lg gold-text">{team.points}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted-foreground py-6">
                        {lang === "pt" ? "Ainda não há jogos" : "No matches played yet"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Category Leaderboards */}
      <section className="container mx-auto px-4 pb-20">
        <h2 className="text-2xl font-display gold-text mb-8 text-center tracking-widest uppercase text-sm">{t("dash.categoryLeaders")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <LeaderboardCard title={t("dash.topScorers")} icon={<Target className="text-primary" size={20} />} entries={leaderboards?.topScorers || []} statKey="goals" noStatsText={t("dash.noStats")} />
          <LeaderboardCard title={t("dash.topAssisters")} icon={<Trophy className="text-primary" size={20} />} entries={leaderboards?.topAssisters || []} statKey="assists" noStatsText={t("dash.noStats")} />
          <LeaderboardCard title={t("dash.topSaves")} icon={<Shield className="text-primary" size={20} />} entries={leaderboards?.topSavers || []} statKey="saves" noStatsText={t("dash.noStats")} />
        </div>
      </section>
    </div>
  );
};

const LeaderboardCard = ({
  title, icon, entries, statKey, noStatsText,
}: {
  title: string; icon: React.ReactNode;
  entries: { player: any; goals: number; assists: number; saves: number }[];
  statKey: "goals" | "assists" | "saves"; noStatsText: string;
}) => (
  <div className="card-shine rounded-lg p-5 gold-glow bg-card/40 border border-primary/10">
    <div className="flex items-center gap-2 mb-6 border-b border-primary/10 pb-3">
      {icon}
      <h3 className="font-display text-[10px] tracking-[0.2em] text-foreground uppercase">{title}</h3>
    </div>
    {entries.length === 0 ? (
      <p className="text-muted-foreground text-xs italic py-4">{noStatsText}</p>
    ) : (
      <div className="space-y-4">
        {entries.map((e, i) => (
          <div key={e.player?.id || i} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <span className={cn(
                "font-display text-sm w-4",
                i === 0 ? "gold-text font-bold" : "text-muted-foreground/50"
              )}>
                {i + 1}
              </span>
              <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">
                {e.player?.name || "Unknown"}
              </span>
            </div>
            <span className={cn(
              "font-display text-lg px-2 rounded bg-secondary/30 min-w-[32px] text-center",
              i === 0 ? "gold-text border border-primary/20" : "text-muted-foreground"
            )}>
              {e[statKey]}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default Dashboard;