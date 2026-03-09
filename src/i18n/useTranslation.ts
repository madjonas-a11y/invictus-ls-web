import { useSyncExternalStore, useCallback } from "react";
import { translations, type TranslationKey } from "./translations";

type Lang = "en" | "pt";

const getLang = (): Lang => {
  const stored = localStorage.getItem("lang");
  return stored === "pt" ? "pt" : "en";
};

// Simple external store so all components re-render on language change
let listeners: (() => void)[] = [];
const subscribe = (cb: () => void) => {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
};
const getSnapshot = () => getLang();

export const setLang = (lang: Lang) => {
  localStorage.setItem("lang", lang);
  listeners.forEach((l) => l());
};

export const useTranslation = () => {
  const lang = useSyncExternalStore(subscribe, getSnapshot);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[lang][key] ?? translations.en[key] ?? key;
    },
    [lang]
  );

  return { t, lang };
};
