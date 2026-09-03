"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { dictionaries, type Language } from "./dictionary";

export type Theme = "dark" | "light";
export type Accent = "amber" | "blue" | "emerald" | "rose" | "violet";

type Prefs = {
  lang: Language;
  theme: Theme;
  accent: Accent;
};

type PrefsContextValue = Prefs & {
  setLang: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  tList: (path: string) => string[];
};

const PrefsContext = createContext<PrefsContextValue | null>(null);

const STORAGE_KEY = "dm-prefs";

const DEFAULT_PREFS: Prefs = {
  lang: "en",
  theme: "dark",
  accent: "amber",
};

function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function applyToDocument(prefs: Prefs) {
  const root = document.documentElement;
  root.setAttribute("data-theme", prefs.theme);
  root.setAttribute("data-accent", prefs.accent);
  root.setAttribute("lang", prefs.lang);
}

function resolvePath(obj: unknown, path: string): string | undefined {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj) as string | undefined;
}

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    const loaded = readPrefs();
    setPrefs(loaded);
    applyToDocument(loaded);
  }, []);

  const update = useCallback((partial: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...partial };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // yoksay
      }
      applyToDocument(next);
      return next;
    });
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const fromLang = resolvePath(dictionaries[prefs.lang], path);
      const value =
        fromLang ??
        resolvePath(dictionaries.en, path) ??
        path.split(".").pop() ??
        path;
      if (!vars) return value;
      return value.replace(/\{(\w+)\}/g, (_, key: string) =>
        key in vars ? String(vars[key]) : `{${key}}`,
      );
    },
    [prefs.lang],
  );

  const tList = useCallback(
    (path: string) => {
      const value =
        resolvePath(dictionaries[prefs.lang], path) ??
        resolvePath(dictionaries.en, path);
      return Array.isArray(value) ? (value as string[]) : [];
    },
    [prefs.lang],
  );

  const value = useMemo<PrefsContextValue>(
    () => ({
      ...prefs,
      setLang: (lang) => update({ lang }),
      setTheme: (theme) => update({ theme }),
      setAccent: (accent) => update({ accent }),
      t,
      tList,
    }),
    [prefs, update, t, tList],
  );

  return (
    <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    throw new Error("usePrefs must be used within PreferencesProvider");
  }
  return ctx;
}

export function useT() {
  return usePrefs().t;
}
