import React, {
  useCallback,
  createContext,
  useEffect,
  useState,
  useMemo,
} from "react";

import { usePreference } from "@/hooks/use-preference";
import { Preferences } from "@/providers/preference-provider";

type Theme = Preferences["theme"];

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  isDarkMode: false,
  setTheme: () => null,
  toggleDarkMode: () => null,
};

export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [isBrowserDarkMode, setIsBrowserDarkMode] = useState(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function updateTheme(event: MediaQueryListEvent | MediaQueryList) {
      setIsBrowserDarkMode(event.matches);
    }

    mediaQuery.addEventListener("change", updateTheme);
    updateTheme(mediaQuery);

    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);

  const preferences = usePreference();
  const theme = preferences.getItem("theme");

  useEffect(() => {
    const systemTheme = isBrowserDarkMode ? "dark" : "light";
    if (systemTheme === theme) preferences.setItem("theme", "system");
  }, [theme, isBrowserDarkMode]);

  const isDarkMode = useMemo(() => {
    return theme === "system" ? isBrowserDarkMode : theme === "dark";
  }, [theme, isBrowserDarkMode]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setTheme(isDarkMode ? "light" : "dark");
  }, [isBrowserDarkMode, isDarkMode]);

  const setTheme = useCallback(
    (theme: Theme) => preferences.setItem("theme", theme),
    []
  );

  return (
    <ThemeProviderContext.Provider
      {...props}
      value={{
        theme,
        isDarkMode,
        setTheme,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeProviderContext.Provider>
  );
}
