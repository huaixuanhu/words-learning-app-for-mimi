"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

export type MimiTheme = "dark" | "light";

const THEME_STORAGE_KEY = "mimi-ui-theme-v1";
const DEFAULT_THEME: MimiTheme = "dark";

type ThemeContextValue = {
  theme: MimiTheme;
  setTheme: (theme: MimiTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const themeListeners = new Set<() => void>();

function normalizeTheme(value: string | null): MimiTheme {
  return value === "light" || value === "dark" ? value : DEFAULT_THEME;
}

function readStoredTheme(): MimiTheme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

function writeStoredTheme(theme: MimiTheme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme preference is UI-only; keep the visual switch even if storage is unavailable.
  }
}

function emitThemeChange() {
  themeListeners.forEach((listener) => listener());
}

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    themeListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function applyTheme(theme: MimiTheme) {
  document.documentElement.dataset.mimiTheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readStoredTheme, () => DEFAULT_THEME);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: MimiTheme) => {
    writeStoredTheme(nextTheme);
    applyTheme(nextTheme);
    emitThemeChange();
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useMimiTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useMimiTheme must be used inside ThemeProvider");
  }

  return value;
}

export { THEME_STORAGE_KEY };
