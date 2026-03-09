import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock } from "lucide-react";

const SESSION_KEY = "admin_authenticated";

const AdminGate = ({ children }: { children: ReactNode }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      setAuthenticated(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-admin", {
        body: { password },
      });

      if (fnError || !data?.success) {
        setError("Invalid password");
      } else {
        sessionStorage.setItem(SESSION_KEY, "true");
        setAuthenticated(true);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card-shine rounded-lg p-8 max-w-sm w-full space-y-6 text-center">
        <div className="space-y-2">
          <Shield size={48} className="mx-auto text-primary" />
          <h1 className="font-display text-2xl tracking-wider gold-text">Admin Access</h1>
          <p className="text-sm text-muted-foreground">Enter the admin password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full bg-secondary border border-border rounded px-3 py-2 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full gold-gradient text-primary-foreground font-display tracking-wider px-6 py-2 rounded text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminGate;
