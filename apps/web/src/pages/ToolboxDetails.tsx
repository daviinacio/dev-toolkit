import { ToolGrid } from "@/components/tool-card";
import { useActiveTool } from "@/hooks/use-toolbox-list";

export default function ToolboxDetailsPage() {
  const { toolbox } = useActiveTool();
  if (!toolbox) return null;

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-semibold tracking-tight">
          {toolbox.name}
        </h1>
        <p className="font-mono text-sm text-muted-foreground">{toolbox.description}</p>
      </div>
      <ToolGrid toolboxes={[toolbox]} />
    </div>
  );
}
