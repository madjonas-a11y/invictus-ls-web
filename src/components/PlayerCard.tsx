import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import RecentForm from "@/components/RecentForm";
import TeamBadge from "@/components/TeamBadge";
import { useTranslation } from "@/i18n/useTranslation"; // <-- Added Translation Hook

const PlayerCard = ({ player }: { player: any }) => {
  const { lang } = useTranslation();

  const initials = player.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Helper to translate positions from DB English to UI Portuguese
  const translatePosition = (pos: string) => {
    if (lang !== "pt") return pos;
    const ptPositions: Record<string, string> = {
      "Goalkeeper": "Guarda-Redes",
      "Fixo": "Fixo",
      "Ala": "Ala",
      "Pivô": "Pivô",
      "Universal": "Universal"
    };
    return ptPositions[pos] || pos;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="group cursor-pointer relative bg-secondary/20 hover:bg-secondary/40 border border-border/50 rounded-lg p-3 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 gold-glow-hover">
          {/* Main Info */}
          <div className="flex flex-col items-center text-center space-y-3">
            
            <div className="relative">
              <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                <AvatarImage src={player.photo_url} alt={player.name} className="object-cover" />
                <AvatarFallback className="bg-background text-muted-foreground font-display text-xs">{initials}</AvatarFallback>
              </Avatar>
              
              {player.team && (
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-[2px] shadow-md border border-border/50 transition-transform group-hover:scale-110">
                  <TeamBadge logoUrl={player.logo_url || null} name={player.team} size={20} />
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-display text-sm tracking-wide text-foreground group-hover:gold-text transition-colors line-clamp-1">
                {player.name}
              </h3>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">
                {player.team || (lang === "pt" ? "Sem Clube" : "Free Agent")}
              </p>
            </div>

            {/* Micro Stats Grid */}
            <div className="grid grid-cols-4 gap-1 pt-2 border-t border-border/30 w-full">
              <div className="text-center border-r border-border/20">
                <p className="text-[8px] text-muted-foreground uppercase">{lang === "pt" ? "J" : "GP"}</p>
                <p className="text-[11px] font-bold text-foreground/70">{player.games_played || 0}</p>
              </div>
              <div className="text-center border-r border-border/20">
                <p className="text-[8px] text-muted-foreground uppercase">G</p>
                <p className="text-[11px] font-bold gold-text">{player.goals || 0}</p>
              </div>
              <div className="text-center border-r border-border/20">
                <p className="text-[8px] text-muted-foreground uppercase">A</p>
                <p className="text-[11px] font-bold text-foreground/70">{player.assists || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] text-muted-foreground uppercase font-bold">{lang === "pt" ? "PF" : "FP"}</p>
                <p className="text-[11px] font-bold text-primary">{player.fantasy_score || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogTrigger>

      {/* Detailed Modal */}
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border-primary/20 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={player.photo_url} className="object-cover" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {player.team && (
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-[2px] shadow-lg border border-primary/50">
                  <TeamBadge logoUrl={player.logo_url || null} name={player.team} size={22} />
                </div>
              )}
            </div>
            <div className="text-left">
              <DialogTitle className="font-display text-2xl gold-text">{player.name}</DialogTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                  {translatePosition(player.position)}
                </Badge>
                <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-primary/30 text-primary">
                  {player.team || (lang === "pt" ? "Sem Clube" : "Free Agent")}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        {/* Expanded Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-border/50">
          <div className="text-center border-r border-border/20">
            <p className="text-2xl font-display text-muted-foreground">{player.games_played || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{lang === "pt" ? "Jogos" : "Games"}</p>
          </div>
          <div className="text-center md:border-r border-border/20">
            <p className="text-2xl font-display gold-text">{player.goals || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{lang === "pt" ? "Golos" : "Goals"}</p>
          </div>
          <div className="text-center border-r border-border/20">
            <p className="text-2xl font-display text-foreground">{player.assists || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{lang === "pt" ? "Assistências" : "Assists"}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display text-primary">{player.fantasy_score || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{lang === "pt" ? "Total PF" : "Total FP"}</p>
          </div>
        </div>

        <div className="py-4">
          <h4 className="text-xs font-display text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {lang === "pt" ? "Forma Recente" : "Recent Match Form"}
          </h4>
          <RecentForm playerId={player.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerCard;