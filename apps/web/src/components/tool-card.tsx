import { Badge } from "@/components/ui/badge";
import { Tool, ToolBox } from "@/hooks/use-toolbox-list";
import { Link } from "react-router-dom";

export function ToolCard({ toolbox, tool }: { toolbox: ToolBox; tool: Tool }) {
  return (
    <Link
      to={`/${toolbox.path}/${tool.path}`}
      className="group flex w-full flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-all duration-150 hover:border-input hover:bg-secondary/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {tool.name}
          </span>
          <Badge variant="outline">{toolbox.name}</Badge>
        </div>
        <span className="shrink-0 font-mono text-sm text-faint transition-colors group-hover:text-primary">
          →
        </span>
      </div>
      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground transition-colors group-hover:text-foreground/80">
        {tool.description}
      </p>
      {tool.tags && tool.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1">
          {tool.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              #{tag}
            </Badge>
          ))}
        </div>
      )}
    </Link>
  );
}

/** "N tools" and a grid of cards, like the design's tool list */
export function ToolGrid({ toolboxes }: { toolboxes: Array<ToolBox> }) {
  const tools = toolboxes.flatMap((toolbox) =>
    toolbox.tools.map((tool) => ({ toolbox, tool }))
  );

  return (
    <div>
      <p className="mb-5 font-mono text-xs text-muted-foreground">
        <span className="text-foreground">{tools.length}</span> tools
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tools.map(({ toolbox, tool }) => (
          <ToolCard key={`${toolbox.path}/${tool.path}`} toolbox={toolbox} tool={tool} />
        ))}
      </div>
    </div>
  );
}

export function ToolHeader({ toolbox, tool }: { toolbox: ToolBox; tool: Tool }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">{toolbox.name}</Badge>
        </div>
        <h1 className="mb-2 font-display text-2xl font-semibold tracking-tight text-foreground">
          {tool.name}
        </h1>
        <p className="max-w-lg font-mono text-sm leading-relaxed text-muted-foreground">
          {tool.description}
        </p>
      </div>
      {tool.tags && tool.tags.length > 0 && (
        <div className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
          {tool.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              #{tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
