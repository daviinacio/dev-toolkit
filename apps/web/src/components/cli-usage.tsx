import { CodeBlock, InlineCode } from "@/components/ui/code-block";
import { Terminal } from "lucide-react";
import { Link } from "react-router-dom";

export type CliCommand = {
  description: string;
  command: string;
};

export function CliUsage({ commands }: { commands: CliCommand[] }) {
  return (
    <section className="rounded-md border p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Terminal className="size-4" />
        <h2 className="font-semibold">Run from the CLI</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        The same tool is available as <InlineCode>dtk</InlineCode>.{" "}
        <Link
          to="/cli#installation"
          className="underline underline-offset-2 hover:text-foreground"
        >
          How to install →
        </Link>
      </p>
      <div className="flex flex-col gap-3">
        {commands.map(({ description, command }, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground">{description}</div>
            <CodeBlock code={command} />
          </div>
        ))}
      </div>
    </section>
  );
}
