import { ToolGrid } from "@/components/tool-card";
import { useToolboxList } from "@/hooks/use-toolbox-list";

export default function Page() {
  const toolboxes = useToolboxList();

  return (
    <div className="px-6 py-6">
      <ToolGrid toolboxes={toolboxes} />
    </div>
  );
}
