import { Shield } from "lucide-react";

interface TeamBadgeProps {
  logoUrl?: string | null;
  name: string;
  size?: number;
}

const TeamBadge = ({ logoUrl, name, size = 20 }: TeamBadgeProps) => (
  <div
    className="rounded-full overflow-hidden bg-secondary border border-border flex items-center justify-center shrink-0"
    style={{ width: size, height: size }}
  >
    {logoUrl ? (
      <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
    ) : (
      <Shield size={size * 0.55} className="text-muted-foreground" />
    )}
  </div>
);

export default TeamBadge;
