import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Same as ~/Git/update-server's dashboard

export type Theme = "system" | "light" | "dark";

interface ThemeState {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
}

// Same key and values as the inline script in index.html, which applies the theme before first paint.
const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeState | null>(null);

function readStoredTheme(): Theme {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

/**
 * Keeps the chosen theme in localStorage ("light" | "dark"; absent means "system") and toggles
 * `.dark` on <html>, which drives Tailwind's `dark:` variant and the shadcn color tokens.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia(DARK_QUERY).matches
  );

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const isDarkMode = theme === "system" ? systemDark : theme === "dark";

  useEffect(() => {
    const root = document.documentElement;
    // Suspend transitions for a frame so the swap doesn't animate every hover/transition style.
    root.classList.add("theme-changing");
    root.classList.toggle("dark", isDarkMode);
    root.style.colorScheme = isDarkMode ? "dark" : "light";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.classList.remove("theme-changing"))
    );
  }, [isDarkMode]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode): the choice lasts for this session only.
    }
  }, []);

  // Picking the same theme the OS uses means "follow the OS", so later OS changes apply again.
  useEffect(() => {
    if (theme !== "system" && theme === (systemDark ? "dark" : "light"))
      setTheme("system");
  }, [theme, systemDark, setTheme]);

  const toggleDarkMode = useCallback(
    () => setTheme(isDarkMode ? "light" : "dark"),
    [isDarkMode, setTheme]
  );

  const value = useMemo(
    () => ({ theme, isDarkMode, setTheme, toggleDarkMode }),
    [theme, isDarkMode, setTheme, toggleDarkMode]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
