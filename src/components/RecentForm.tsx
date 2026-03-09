import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Target, Users, Shield } from "lucide-react";

interface MatchLog {
  id: string;
  match_date: string | null;
  goals: number | null;
  assists: number | null;
  saves: number | null;
}

const RecentForm = ({ playerId }: { playerId: string }) => {
  const [logs, setLogs] = useState<MatchLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("match_logs")
        .select("*")
        .eq("player_id", playerId)
        .order("match_date", { ascending: false })
        .limit(5);
      setLogs(data || []);
      setLoading(false);
    };
    fetch();
  }, [playerId]);

  if (loading) {
    return (
      <div className="py-4 px-6 text-center text-muted-foreground text-xs animate-pulse">
        Loading recent form…
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-4 px-6 text-center text-muted-foreground text-xs">
        No recent matches played
      </div>
    );
  }

  return (
    <div className="py-4 px-4">
      <p className="text-xs text-muted-foreground font-display tracking-widest mb-3 px-2">RECENT FORM</p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex-shrink-0 w-32 rounded-md border border-border bg-secondary/40 p-3 space-y-2"
          >
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar size={12} />
              <span className="text-[11px]">
                {log.match_date
                  ? new Date(log.match_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                  : "—"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <Target size={12} className="mx-auto text-primary mb-0.5" />
                <span className="text-sm font-display gold-text">{log.goals ?? 0}</span>
              </div>
              <div>
                <Users size={12} className="mx-auto text-primary mb-0.5" />
                <span className="text-sm font-display gold-text">{log.assists ?? 0}</span>
              </div>
              <div>
                <Shield size={12} className="mx-auto text-primary mb-0.5" />
                <span className="text-sm font-display gold-text">{log.saves ?? 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentForm;
