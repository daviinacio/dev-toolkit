import { CliUsage } from "@/components/cli-usage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generatePeople, generatePerson } from "common/lib/person";
import { Copy, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

export default function BrazilianPerson_ToolPage() {
  const [count, setCount] = useState(1);
  const [seed, setSeed] = useState(0);
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => {
    // seed is referenced so re-generation re-runs useMemo.
    void seed;
    const safeCount = Math.max(1, Math.min(100, Math.floor(count) || 1));
    const data = safeCount === 1 ? generatePerson() : generatePeople(safeCount);
    return JSON.stringify(data, null, 2);
  }, [count, seed]);

  const handleGenerate = () => {
    setSeed((s) => s + 1);
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <label className="font-sm py-1 font-semibold">Brazilian / Person</label>

      <section className="rounded-md border p-4 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Generates fictional Brazilian person records as JSON. All CPFs are
          mathematically valid but random — for testing only.
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">Count (1–100)</span>
            <Input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <Button onClick={handleGenerate} variant="secondary">
            <RefreshCcw />
            Generate
          </Button>
          <Button onClick={handleCopy} variant="outline">
            <Copy />
            {copied ? "Copied" : "Copy JSON"}
          </Button>
        </div>
      </section>

      <pre className="flex-1 min-h-96 max-h-[60vh] overflow-auto rounded-md bg-slate-900 text-slate-100 text-sm p-4 font-mono">
        {json}
      </pre>

      <CliUsage
        commands={[
          {
            description: "Generate one person (compact JSON)",
            command: "dtk person generate",
          },
          {
            description: "Generate 5 people, pretty-printed",
            command: "dtk person generate -c 5 -p",
          },
        ]}
      />
    </div>
  );
}
