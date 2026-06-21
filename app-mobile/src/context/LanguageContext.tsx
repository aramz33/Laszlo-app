import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Lang } from "../services/runtime";

/**
 * Demo languages. The visitor-facing output is generated at runtime in the
 * chosen language (notices are stored only in en/nl), so the picker is a real
 * feature: it drives the `lang` sent to every /generate + /speak call.
 */
export const DEMO_LANGS: readonly Lang[] = ["fr", "en", "nl"] as const;

export const LANG_LABELS: Record<Lang, string> = {
  fr: "FR",
  en: "EN",
  nl: "NL",
};

export const LANG_NAMES: Record<Lang, string> = {
  fr: "French",
  en: "English",
  nl: "Dutch",
};

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLang = "fr",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang }),
    [lang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
