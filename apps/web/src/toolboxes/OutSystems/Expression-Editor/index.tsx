import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodeEditor, CodeEditorInstance } from "@/components/ui/code-editor";
import { cn } from "@/lib/utils";
import { CustomLanguageFunction, functionSnippet } from "@/lib/custom-lang";
import { useEffect, useMemo, useRef, useState } from "react";
import { evaluateExpression } from "./evaluate";
import { FunctionList } from "./functions-list";
import { OutSystemsLang } from "./os-lang";
import { VariablesPanel } from "./variables-panel";

const sectionLabel = "font-mono text-[10px] uppercase tracking-widest text-muted-foreground";

/** Monaco's built-in snippet contribution, the one the autocomplete uses (not exported in its types) */
type SnippetController = { insert: (template: string) => void };

export default function OutSystemsExpression_ToolPage() {
  const [refresh, setRefresh] = useState(false);
  const editorRef = useRef<CodeEditorInstance>();

  // Inserts the call at the cursor (or over the selection), like picking it from the autocomplete
  const insertFunction = (fn: CustomLanguageFunction) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const snippets = editor.getContribution(
      "snippetController2"
    ) as unknown as SnippetController | null;
    snippets?.insert(functionSnippet(fn));
  };

  const [outsystemsCode, setOutsystemsCode] = useState<string>();
  // Test values keyed by lowercase variable name, kept even while a variable is out of the code
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const code = [outsystemsCode, ...Object.values(variableValues)].join("\n");
    if (!code.includes("CurrDateTime()") && !code.includes("CurrTime()")) return;

    const interval = setInterval(() => {
      setRefresh((p) => !p);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [outsystemsCode, variableValues]);

  const evaluation = useMemo(
    () => evaluateExpression(outsystemsCode || "", variableValues),
    // refresh re-runs expressions that use the current time
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outsystemsCode, variableValues, refresh]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-96 gap-3">
        <div className="flex h-full min-w-0 flex-1 flex-col gap-1.5">
          <label className={sectionLabel}>Expression</label>
          <div className="min-h-0 flex-1">
            <CodeEditor
              language="outsystems"
              customLanguages={[OutSystemsLang]}
              value={outsystemsCode}
              onChange={setOutsystemsCode}
              onEditorMount={(editor) => (editorRef.current = editor)}
            />
          </div>
        </div>
        <FunctionList onSelect={insertFunction} />
      </div>

      <VariablesPanel
        variables={evaluation.variables}
        values={variableValues}
        onChange={(name, value) =>
          setVariableValues((values) => ({ ...values, [name.toLowerCase()]: value }))
        }
      />

      <div className="flex flex-col gap-1.5">
        <label className={sectionLabel}>Result</label>
        <pre className="min-h-28 whitespace-pre-wrap rounded-lg border bg-background px-3 py-2 font-mono text-sm">
          {evaluation.error ? (
            <span className="text-destructive">✕ {evaluation.error}</span>
          ) : evaluation.text !== undefined ? (
            <span className="text-primary">{evaluation.text}</span>
          ) : (
            <span className="text-faint">result appears here...</span>
          )}
        </pre>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger className={cn(sectionLabel, "py-2")}>
            Extra for nerds · transpiled JavaScript
          </AccordionTrigger>
          <AccordionContent>
            <pre className="min-h-28 overflow-x-auto rounded-lg border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
              {evaluation.javascript || (
                <span className="text-faint">the transpiled code appears here...</span>
              )}
            </pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
