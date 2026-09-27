import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useToolboxList } from "@/hooks/use-toolbox-list";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type PaletteItem = {
  to: string;
  label: string;
  hint: string;
  group: "Tools" | "Toolboxes" | "Pages";
  /** Extra text matched by the search, e.g. description and tags */
  keywords: Array<string>;
};

const groups: Array<PaletteItem["group"]> = ["Tools", "Toolboxes", "Pages"];

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const toolboxes = useToolboxList();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo<Array<PaletteItem>>(
    () => [
      ...toolboxes.flatMap((toolbox) =>
        toolbox.tools.map((tool) => ({
          to: `/${toolbox.path}/${tool.path}`,
          label: tool.name,
          hint: toolbox.name,
          group: "Tools" as const,
          keywords: [tool.description, toolbox.name, ...(tool.tags || [])],
        }))
      ),
      ...toolboxes.map((toolbox) => ({
        to: `/${toolbox.path}`,
        label: toolbox.name,
        hint: `${toolbox.tools.length} tools`,
        group: "Toolboxes" as const,
        keywords: [toolbox.description],
      })),
      {
        to: "/",
        label: "All tools",
        hint: "home",
        group: "Pages",
        keywords: ["home", "list"],
      },
      {
        to: "/cli",
        label: "CLI installation",
        hint: "dtk",
        group: "Pages",
        keywords: ["command line", "terminal", "install", "npm"],
      },
    ],
    [toolboxes]
  );

  // Every word of the query must match the label, hint or keywords
  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = items.filter((item) => {
      const text = [item.label, item.hint, ...item.keywords].join(" ").toLowerCase();
      return words.every((word) => text.includes(word));
    });
    return groups.flatMap((group) => matches.filter((it) => it.group === group));
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const select = (item: PaletteItem | undefined) => {
    if (!item) return;
    navigate(item.to);
    onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (results.length ? (i + step + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[active]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        aria-describedby={undefined}
        className="top-20 max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Search tools</DialogTitle>

        <div className="flex h-12 items-center gap-3 border-b px-4">
          <span className="shrink-0 font-mono text-sm text-primary">$</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="search tools..."
            role="combobox"
            aria-expanded
            aria-controls="command-palette-results"
            aria-activedescendant={results.length ? `command-palette-item-${active}` : undefined}
            className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-faint"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div
          ref={listRef}
          id="command-palette-results"
          role="listbox"
          className="max-h-80 overflow-y-auto py-1"
        >
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
              no results for "{query}"
            </p>
          ) : (
            results.map((item, index) => (
              <div key={item.to}>
                {item.group !== results[index - 1]?.group && (
                  <p className="px-4 pb-1 pt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {item.group}
                  </p>
                )}
                <div
                  id={`command-palette-item-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => setActive(index)}
                  onClick={() => select(item)}
                  className={cn(
                    "group flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors",
                    index === active && "bg-secondary"
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 font-mono text-xs text-faint",
                      index === active && "text-primary"
                    )}
                  >
                    ›
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm text-muted-foreground",
                      index === active && "text-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {item.hint}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t px-4 py-2 font-mono text-[10px] text-muted-foreground">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
