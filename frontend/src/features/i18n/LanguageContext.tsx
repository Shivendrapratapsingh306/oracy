"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import enMessages from "@/messages/en.json";
import hiMessages from "@/messages/hi.json";
import teMessages from "@/messages/te.json";

export type SupportedLanguage = "en" | "hi" | "te";

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
] as const;

const STORAGE_KEY = "oracy.language";
const COOKIE_NAME = "oracy_locale";

type TranslationDictionary = typeof enMessages;

const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  en: enMessages,
  hi: hiMessages as unknown as TranslationDictionary,
  te: teMessages as unknown as TranslationDictionary,
};

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  languages: readonly LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [initialized, setInitialized] = useState(false);

  // Initialize language from URL query (?lang=...), localStorage, cookie, or browser locale
  useEffect(() => {
    try {
      // 1. URL search param check (e.g. ?lang=hi)
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const queryLang = urlParams.get("lang")?.toLowerCase() as SupportedLanguage | null;
        if (queryLang && (queryLang === "en" || queryLang === "hi" || queryLang === "te")) {
          setLanguageState(queryLang);
          localStorage.setItem(STORAGE_KEY, queryLang);
          document.cookie = `${COOKIE_NAME}=${queryLang}; path=/; max-age=31536000; SameSite=Lax`;
          setInitialized(true);
          return;
        }

        // 2. localStorage check
        const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
        if (stored === "en" || stored === "hi" || stored === "te") {
          setLanguageState(stored);
          document.cookie = `${COOKIE_NAME}=${stored}; path=/; max-age=31536000; SameSite=Lax`;
          setInitialized(true);
          return;
        }

        // 3. Cookie check
        const cookies = document.cookie.split(";").map((c) => c.trim());
        const localeCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
        if (localeCookie) {
          const cookieVal = localeCookie.split("=")[1] as SupportedLanguage;
          if (cookieVal === "en" || cookieVal === "hi" || cookieVal === "te") {
            setLanguageState(cookieVal);
            setInitialized(true);
            return;
          }
        }

        // 4. Browser locale preference fallback (default English)
        const navLang = navigator.language.toLowerCase();
        if (navLang.startsWith("hi")) {
          setLanguageState("hi");
        } else if (navLang.startsWith("te")) {
          setLanguageState("te");
        } else {
          setLanguageState("en");
        }
      }
    } catch {
      // Fallback to English on read errors
      setLanguageState("en");
    } finally {
      setInitialized(true);
    }
  }, []);

  // Update HTML document lang attribute when language changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, newLang);
        document.cookie = `${COOKIE_NAME}=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      // Ignore write errors
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // Look up in current active language dictionary
      const currentDict = dictionaries[language] as unknown as Record<string, unknown>;
      let val = getNestedValue(currentDict, key);

      // Fall back to English dictionary if missing
      if (!val && language !== "en") {
        const enDict = dictionaries.en as unknown as Record<string, unknown>;
        val = getNestedValue(enDict, key);
      }

      // If still missing, return the key itself
      if (!val) {
        return key;
      }

      // Interpolate parameters {param}
      if (params) {
        return Object.entries(params).reduce((str, [k, v]) => {
          return str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }, val);
      }

      return val;
    },
    [language]
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
        const localeTag = language === "hi" ? "hi-IN" : language === "te" ? "te-IN" : "en-US";
        return new Intl.DateTimeFormat(localeTag, options || {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(d);
      } catch {
        return String(date);
      }
    },
    [language]
  );

  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions): string => {
      try {
        const localeTag = language === "hi" ? "hi-IN" : language === "te" ? "te-IN" : "en-US";
        return new Intl.NumberFormat(localeTag, options).format(num);
      } catch {
        return String(num);
      }
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      formatDate,
      formatNumber,
      languages: LANGUAGES,
    }),
    [language, setLanguage, t, formatDate, formatNumber]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: "en" as SupportedLanguage,
      setLanguage: () => {},
      t: (k: string) => k,
      formatDate: (d: Date | string | number) => String(d),
      formatNumber: (n: number) => String(n),
      languages: LANGUAGES,
    };
  }
  return context;
}

export const useTranslation = useLanguage;

