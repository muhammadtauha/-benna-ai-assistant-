import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Lang = "en" | "ar";

interface LanguageContextValue {
  language: Lang;
  setLanguage: (l: Lang) => void;
  isRTL: boolean;
  t: (en: string, ar: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Lang>(() => {
    try {
      return (localStorage.getItem("benna-lang") as Lang) || "en";
    } catch {
      return "en";
    }
  });

  const setLanguage = (l: Lang) => {
    setLanguageState(l);
    try {
      localStorage.setItem("benna-lang", l);
    } catch {
      /* ignore */
    }
  };

  const isRTL = language === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const t = (en: string, ar: string) => (isRTL ? ar : en);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
};
