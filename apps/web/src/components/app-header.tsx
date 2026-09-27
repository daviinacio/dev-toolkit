import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useToolboxList } from "@/hooks/use-toolbox-list";
import { modifierKeyLabel } from "@/lib/platform";
import { Link } from "react-router-dom";
import pkg from "../../package.json";

const REPOSITORY_URL = "https://github.com/daviinacio/dev-toolkit";

export function AppHeader({ onSearch }: { onSearch: () => void }) {
  const toolCount = useToolboxList().reduce((sum, it) => sum + it.tools.length, 0);

  return (
    <header className="z-30 flex h-12 shrink-0 items-center gap-4 border-b bg-background px-4">
      <Link to="/" className="flex shrink-0 items-center gap-2.5">
        <div className="flex size-6 items-center justify-center rounded bg-primary">
          <span className="font-mono text-[9px] font-bold leading-none text-primary-foreground">
            DK
          </span>
        </div>
        <span className="font-display text-sm font-semibold tracking-tight">
          Dev Toolkit
        </span>
        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
          v{pkg.version}
        </span>
      </Link>

      <span className="hidden select-none text-border md:block">|</span>

      <button
        type="button"
        onClick={onSearch}
        className="flex h-7 min-w-0 items-center gap-2 rounded border bg-card px-3 font-mono text-xs text-muted-foreground transition-colors hover:border-input hover:text-foreground"
      >
        <span className="text-primary">$</span>
        <span className="truncate">search tools...</span>
        <KbdGroup className="ml-2 hidden sm:inline-flex">
          <Kbd>{modifierKeyLabel}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden font-mono text-[10px] text-muted-foreground md:block">
          {toolCount} tools · free & open source
        </span>
        <Button asChild variant="outline" size="sm" className="text-[10px]">
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </Button>
      </div>
    </header>
  );
}
