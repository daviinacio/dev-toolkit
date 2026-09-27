import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VariableIcon } from "lucide-react";
import { evaluateExpression } from "./evaluate";

export type VariablesPanelProps = {
  variables: Array<string>;
  /** Test values keyed by lowercase variable name, since names are case-insensitive */
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
};

export function VariablesPanel({ variables, values, onChange }: VariablesPanelProps) {
  return (
    <div className="rounded-md border mt-2 px-3 py-2">
      <div className="flex items-center gap-x-1 font-semibold">
        <VariableIcon size={18} />
        Variables
      </div>

      {variables.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-1">
          Variables used in the expression, like <code>StartDate</code> in{" "}
          <code>FormatDateTime(StartDate, "yyyy/MMM")</code>, show up here so you
          can give them a test value.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mt-1">
            Write each test value as an OutSystems expression, e.g.{" "}
            <code>"text"</code>, <code>10</code>, <code>2.5</code>,{" "}
            <code>True</code>, <code>#2024-05-10#</code> or <code>CurrDate()</code>.
          </p>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 mt-2">
            {variables.map((name) => {
              const value = values[name.toLowerCase()] ?? "";
              return (
                <VariableRow
                  key={name.toLowerCase()}
                  name={name}
                  value={value}
                  onChange={(value) => onChange(name, value)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function VariableRow({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  // The value is evaluated on its own to show the data type it resolves to
  const evaluation = value.trim() ? evaluateExpression(value) : undefined;
  const invalid = !!evaluation?.error || (evaluation?.variables.length ?? 0) > 0;

  return (
    <>
      <label htmlFor={`variable-${name}`} className="font-mono text-sm">
        {name}
      </label>
      <Input
        id={`variable-${name}`}
        className={cn("font-mono", invalid && "border-destructive")}
        placeholder='#2024-05-10#, "text", 10, True...'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
      <span
        className={cn(
          "text-xs w-20",
          invalid ? "text-destructive" : "text-muted-foreground"
        )}
        title={evaluation?.variables.length ? "Test values can't use other variables" : evaluation?.error}
      >
        {!evaluation ? "No value" : invalid ? "Invalid" : evaluation.type}
      </span>
    </>
  );
}
