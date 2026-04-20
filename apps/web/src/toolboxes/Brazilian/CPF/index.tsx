import { CliUsage } from "@/components/cli-usage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCpf, generateCpf, validateCpf } from "common/lib/cpf";
import { CheckCircle2, Copy, RefreshCcw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

type ValidationStatus = "idle" | "valid" | "invalid";

export default function BrazilianCpf_ToolPage() {
  const [generated, setGenerated] = useState<string>(() => generateCpf(true));
  const [input, setInput] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const status: ValidationStatus = useMemo(() => {
    if (input.trim() === "") return "idle";
    return validateCpf(input) ? "valid" : "invalid";
  }, [input]);

  const handleGenerate = () => {
    setGenerated(generateCpf(true));
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      <label className="font-sm py-1 font-semibold">Brazilian / CPF</label>

      <section className="rounded-md border p-4 flex flex-col gap-3">
        <h2 className="font-semibold">Generate</h2>
        <p className="text-sm text-muted-foreground">
          Produces a random CPF with valid check digits. Useful for testing —
          never use for real registrations.
        </p>
        <div className="flex gap-2 items-center">
          <Input
            readOnly
            value={generated}
            className="font-mono text-lg tracking-wider"
          />
          <Button onClick={handleGenerate} variant="secondary" title="Generate">
            <RefreshCcw />
          </Button>
          <Button onClick={handleCopy} variant="outline" title="Copy">
            <Copy />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </section>

      <section className="rounded-md border p-4 flex flex-col gap-3">
        <h2 className="font-semibold">Validate</h2>
        <p className="text-sm text-muted-foreground">
          Paste a CPF with or without punctuation.
        </p>
        <Input
          placeholder="000.000.000-00"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-mono text-lg tracking-wider"
        />
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
            status === "idle" && "bg-muted text-muted-foreground",
            status === "valid" && "bg-green-100 text-green-900",
            status === "invalid" && "bg-red-100 text-red-900",
          )}
        >
          {status === "idle" && <span>Waiting for input…</span>}
          {status === "valid" && (
            <>
              <CheckCircle2 className="size-4" />
              <span>Valid CPF — formatted: {formatCpf(input)}</span>
            </>
          )}
          {status === "invalid" && (
            <>
              <XCircle className="size-4" />
              <span>Invalid CPF</span>
            </>
          )}
        </div>
      </section>

      <CliUsage
        commands={[
          {
            description: "Generate 5 CPFs with punctuation",
            command: "dtk cpf generate -c 5 -f",
          },
          {
            description: "Validate a CPF (accepts raw digits or formatted)",
            command: `dtk cpf validate ${generated}`,
          },
        ]}
      />
    </div>
  );
}
