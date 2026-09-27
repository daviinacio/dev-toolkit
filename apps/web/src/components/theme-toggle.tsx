import { Button } from "@/components/ui/button";
import { useTheme } from "@/providers/theme-provider";
import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-7"
      onClick={toggleDarkMode}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={isDarkMode ? "Light mode" : "Dark mode"}
    >
      {isDarkMode ? <SunIcon className="!size-3.5" /> : <MoonIcon className="!size-3.5" />}
    </Button>
  );
}
