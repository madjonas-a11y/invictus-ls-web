import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import TeamBadge from "@/components/TeamBadge";

interface MvpData {
  id: string;
  player_id: string;
  match_date: string;
  goals: number;
  assists: number;
  saves: number;
  player_name: string;
  photo_url: string | null;
  team: string;
  team_logo_url: string | null;
}

export const useMvp = () =>
  useQuery<MvpData | null>({
    queryKey: ["latestMvp"],
    queryFn: async () => {
      // Use rpc-style raw query to avoid type issues with new column
      const { data, error } = await (supabase as any)
        .from("match_logs")
        .select("*")
        .eq("is_mvp", true)
        .order("match_date", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const row = data[0];

      // Fetch the player info
      const { data: player } = await supabase
        .from("players")
        .select("name, photo_url, team")
        .eq("id", row.player_id!)
        .maybeSingle();

      // Fetch team logo
      let teamLogoUrl: string | null = null;
      if (player?.team) {
        const { data: team } = await supabase
          .from("teams")
          .select("logo_url")
          .eq("name", player.team)
          .maybeSingle();
        teamLogoUrl = team?.logo_url ?? null;
      }

      return {
        id: row.id,
        player_id: row.player_id,
        match_date: row.match_date,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
        saves: row.saves ?? 0,
        player_name: player?.name ?? "Unknown",
        photo_url: player?.photo_url ?? null,
        team: player?.team ?? "",
        team_logo_url: teamLogoUrl,
      } as MvpData;
    },
  });

const MvpCard = () => {
  const { data: mvp } = useMvp();

  if (!mvp) return null;

  return (
    <div className="card-shine rounded-lg p-6 max-w-md mx-auto gold-glow relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />

      <div className="relative z-10 flex flex-col items-center text-center gap-3">
        {/* Badge */}
        <div className="flex items-center gap-2 gold-gradient px-4 py-1.5 rounded-full">
          <Trophy size={16} className="text-primary-foreground" />
          <span className="font-display text-xs tracking-widest text-primary-foreground uppercase">Player of the Match</span>
        </div>

        {/* Avatar */}
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/40 bg-secondary mt-2">
          {mvp.photo_url ? (
            <img src={mvp.photo_url} alt={mvp.player_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-display text-muted-foreground">
              {mvp.player_name.charAt(0)}
            </div>
          )}
        </div>

        {/* Name & Team */}
        <div>
          <h3 className="font-display text-xl gold-text">{mvp.player_name}</h3>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <TeamBadge logoUrl={mvp.team_logo_url} name={mvp.team} size={16} />
            <span className="text-xs text-muted-foreground">{mvp.team}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-2 w-full max-w-[240px]">
          {[
            { label: "Goals", value: mvp.goals, emoji: "⚽" },
            { label: "Assists", value: mvp.assists, emoji: "🅰️" },
            { label: "Saves", value: mvp.saves, emoji: "🧤" },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-border bg-secondary/30 py-2 px-1">
              <span className="text-lg">{s.emoji}</span>
              <p className="font-display text-lg gold-text">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground mt-1">
          {mvp.match_date ? new Date(mvp.match_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
        </p>
      </div>
    </div>
  );
};

export default MvpCard;
