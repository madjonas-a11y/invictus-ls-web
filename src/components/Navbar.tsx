import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo-clean.png";
import { useTranslation } from "@/i18n/useTranslation";
import type { TranslationKey } from "@/i18n/translations";

const navItems: { labelKey: string; path: string }[] = [
  { labelKey: "nav.dashboard", path: "/dashboard" },
  { labelKey: "nav.roster", path: "/roster" },
  { labelKey: "nav.matches", path: "/matches" },
  { labelKey: "nav.fantasy", path: "/fantasy" },
  { labelKey: "nav.funZone", path: "/fun-zone" },
  { labelKey: "nav.challengeUs", path: "/challenge-us" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={logo} alt="Invictus LS" className="h-10 w-10 object-contain rounded-full" />
          <span className="font-display text-xl tracking-wider gold-text hidden sm:block">
            Invictus LS
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`font-display text-sm tracking-widest transition-colors hover:text-primary ${
                location.pathname === item.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {/* Fallback to "Fantasy" if the translation key doesn't exist yet */}
              {item.labelKey === "nav.fantasy" ? "Fantasy" : t(item.labelKey as TranslationKey)}
            </Link>
          ))}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-b border-border">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`block px-6 py-3 font-display text-sm tracking-widest transition-colors hover:text-primary ${
                location.pathname === item.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.labelKey === "nav.fantasy" ? "Fantasy" : t(item.labelKey as TranslationKey)}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;