"use client";

/**
 * Client-side i18n context for Ko Wallet.
 *
 * Server components use `getServerT()` from `lib/user-lang.ts`.
 * Client components use `useT()` after being wrapped in <LangProvider>.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeT, translate, type Lang, type T } from "@/lib/i18n";

const LangContext = createContext<Lang>("en");

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): T {
  const lang = useContext(LangContext);
  return useMemo<T>(() => makeT(lang), [lang]);
}

/** Escape hatch — translate without a hook (e.g. inside non-React utilities). */
export function tFor(lang: Lang, key: string): string {
  return translate(key, lang);
}
