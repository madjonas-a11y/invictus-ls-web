import React, { useState } from "react";
import { useFantasyScores } from "@/hooks/useSupabaseData";
import { Star, ChevronDown, Info } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import RecentForm from "@/components/RecentForm";
import TeamBadge from "@/components/TeamBadge";

const Fantasy = () => {
  const { data: fantasyScores } = useFantasyScores();
  const { t, lang } = useTranslation();
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-10">
          <Star className="inline-block text-primary mb-2" size={32} />
          <h1 className="text-3xl md:text-4xl font-display gold-text uppercase tracking-widest">
            {t("dash.fantasyLeaderboard")}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 font-display tracking-widest">
            {lang === "pt" ? "Ranking Oficial de Jogadores" : "Official Player Rankings"}
          </p>
        </div>

        {/* How Fantasy Points Work */}
        <section className="mb-16">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Info size={18} className="text-primary" />
            <h2 className="text-xl font-display gold-text uppercase tracking-wider">{t("dash.howFantasyWorks")}</h2>
          </div>
          
          <div className="card-shine rounded-lg p-6 max-w-3xl mx-auto gold-glow bg-card/30">
            <p className="text-muted-foreground text-sm mb-6 text-center italic">{t("dash.fantasyDescription")}</p>
            
            {/* Grid updated to 5 columns for desktop to include Appearance and Autogolo points */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: lang === "pt" ? "Presença" : "Match Played", pts: "+5", icon: "🏃" },
                { label: t("dash.goalScored"), pts: "+10", icon: "⚽" },
                { label: t("dash.assist"), pts: "+5", icon: "🅰️" },
                { label: t("dash.saveGK"), pts: "+1", icon: "🧤" },
                { label: lang === "pt" ? "Autogolo" : "Own Goal", pts: "-5", icon: "🚫", isPenalty: true },
              ].map((r) => (
                <div key={r.label} className="rounded-md border border-border bg-secondary/30 p-4 text-center">
                  <span className="text-2xl">{r.icon}</span>
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-tighter leading-tight h-6 flex items-center justify-center">
                    {r.label}
                  </p>
                  <p className={cn("font-display text-lg mt-1", r.isPenalty ? "text-red-500" : "gold-text")}>
                    {r.pts}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-center">
                <span className="text-2xl">⭐</span>
                <p className="text-xs text-muted-foreground mt-2">{t("dash.mvpBonus")}</p>
                <p className="font-display gold-text text-lg mt-1">+15</p>
                <p className="text-[10px] text-muted-foreground mt-2 text-left leading-tight px-1 italic">
                  {lang === "pt" 
                    ? "Atribuído automaticamente. Desempate: 1º Equipa vencedora, 2º Mais Golos, 3º Mais Assist." 
                    : "Auto-awarded. Tie-breakers: 1st Winning team, 2nd Most Goals, 3rd Most Assists."}
                </p>
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-center">
                <span className="text-2xl">🎩</span>
                <p className="text-xs text-muted-foreground mt-2">{t("dash.playmakerBonus")}</p>
                <p className="font-display gold-text text-lg mt-1">+10</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("dash.playmakerDesc")}</p>
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-center">
                <span className="text-2xl">🧱</span>
                <p className="text-xs text-muted-foreground mt-2">{t("dash.brickWallBonus")}</p>
                <p className="font-display gold-text text-lg mt-1">+10</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("dash.brickWallDesc")}</p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-2 text-[11px] md:text-xs text-muted-foreground">
              <p><span className="text-foreground font-medium uppercase tracking-tighter mr-1">{t("dash.formula")}:</span> {t("dash.formulaValue")}</p>
              <p><span className="text-foreground font-medium uppercase tracking-tighter mr-1">{t("dash.eligibility")}:</span> {t("dash.eligibilityValue")}</p>
              <p><span className="text-foreground font-medium uppercase tracking-tighter mr-1">{t("dash.updates")}:</span> {t("dash.updatesValue")}</p>
            </div>
          </div>
        </section>

        {/* Fantasy Leaderboard Table */}
        <div className="card-shine rounded-lg gold-glow overflow-hidden">
          <div className="bg-secondary/20 p-4 border-b border-border/50">
            <h3 className="font-display text-sm tracking-[0.2em] text-center text-foreground uppercase">
              {lang === "pt" ? "Tabela de Classificação" : "Leaderboard Standings"}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-display tracking-wider text-xs">
                  <th className="text-left px-4 py-4 w-12">#</th>
                  <th className="text-left px-4 py-4">{t("dash.player")}</th>
                  <th className="text-center px-3 py-4" title={lang === "pt" ? "Jogos" : "Games Played"}>
                    {lang === "pt" ? "J" : "GP"}
                  </th>
                  <th className="text-center px-3 py-4" title={lang === "pt" ? "Golos" : "Goals"}>G</th>
                  <th className="text-center px-3 py-4" title={lang === "pt" ? "Assistências" : "Assists"}>A</th>
                  <th className="text-center px-3 py-4" title={lang === "pt" ? "Defesas" : "Saves"}>
                    {lang === "pt" ? "D" : "S"}
                  </th>
                  <th className="text-center px-4 py-4 text-primary" title={lang === "pt" ? "Pontos Fantasy" : "Fantasy Points"}>
                    {t("dash.totalPoints")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(!fantasyScores || fantasyScores.length === 0) ? (
                  <tr><td colSpan={7} className="text-center text-muted-foreground py-12 italic">{t("dash.noStats")}</td></tr>
                ) : (
                  fantasyScores.map((p, i) => (
                    <React.Fragment key={p.id}>
                      <tr
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer select-none"
                        onClick={() => setExpandedPlayer(expandedPlayer === p.id ? null : p.id)}
                      >
                        <td className={`px-4 py-4 font-display ${i === 0 ? "gold-text text-lg" : "text-muted-foreground"}`}>{i + 1}</td>
                        <td className="px-4 py-4 text-foreground font-medium">
                          <div className="flex items-center gap-3">
                            <TeamBadge logoUrl={null} name={p.team ?? ""} size={20} />
                            <span className="truncate max-w-[120px] md:max-w-none">{p.name}</span>
                            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", expandedPlayer === p.id && "rotate-180")} />
                          </div>
                        </td>
                        <td className="text-center px-3 py-4 text-muted-foreground">{p.games_played}</td>
                        <td className="text-center px-3 py-4 text-muted-foreground">{p.goals}</td>
                        <td className="text-center px-3 py-4 text-muted-foreground">{p.assists}</td>
                        <td className="text-center px-3 py-4 text-muted-foreground">{p.saves}</td>
                        <td className="text-center px-4 py-4 font-display text-lg gold-text">{p.fantasy_score}</td>
                      </tr>
                      {expandedPlayer === p.id && p.id && (
                        <tr className="bg-secondary/20">
                          <td colSpan={7} className="p-0 border-b border-border/50">
                            <RecentForm playerId={p.id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for conditional class merging
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

export default Fantasy;