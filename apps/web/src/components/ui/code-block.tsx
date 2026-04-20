import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { ReactNode, useState } from "react";

export function CodeBlock({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("relative", className)}>
      <pre className="rounded-md bg-slate-900 text-slate-100 text-sm p-4 pr-12 font-mono overflow-x-auto">
        {code}
      </pre>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCopy}
        title="Copy"
        className="absolute top-2 right-2 text-slate-300 hover:text-white hover:bg-slate-800"
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
      {children}
    </code>
  );
}
