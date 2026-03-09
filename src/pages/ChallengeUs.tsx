import { useState } from "react";
import { useInsertChallenge } from "@/hooks/useSupabaseData";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/useTranslation";

const ChallengeUs = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const insertChallenge = useInsertChallenge();

  const [teamName, setTeamName] = useState("");
  const [contact, setContact] = useState("");
  const [prefDate, setPrefDate] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!teamName.trim() || !contact.trim()) {
      toast({ title: t("challenge.fillRequired"), variant: "destructive" });
      return;
    }
    try {
      await insertChallenge.mutateAsync({
        team_name: teamName,
        contact,
        preferred_date: prefDate || undefined,
        message: message || undefined,
      });
      toast({ title: t("challenge.submitted") });
      setTeamName("");
      setContact("");
      setPrefDate("");
      setMessage("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-display gold-text text-center mb-10">{t("challenge.title")}</h1>
        <section className="max-w-lg mx-auto">
          <p className="text-muted-foreground text-center mb-6 text-sm">{t("challenge.description")}</p>
          <div className="card-shine rounded-lg p-6 gold-glow space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">{t("challenge.teamName")}</label>
              <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)}
                placeholder={t("challenge.teamPlaceholder")}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("challenge.contact")}</label>
              <input type="text" value={contact} onChange={(e) => setContact(e.target.value)}
                placeholder={t("challenge.contactPlaceholder")}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("challenge.preferredDate")}</label>
              <input type="date" value={prefDate} onChange={(e) => setPrefDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("challenge.message")}</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder={t("challenge.messagePlaceholder")}
                rows={3}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
            <button onClick={handleSubmit} disabled={insertChallenge.isPending}
              className="w-full gold-gradient text-primary-foreground font-display tracking-wider py-2 rounded text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Send size={16} />
              {insertChallenge.isPending ? t("challenge.submitting") : t("challenge.send")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ChallengeUs;
