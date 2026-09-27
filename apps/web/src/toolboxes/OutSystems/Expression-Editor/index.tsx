import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodeEditor, CodeEditorInstance } from "@/components/ui/code-editor";
import { CustomLanguageFunction, functionSnippet } from "@/lib/custom-lang";
import { useEffect, useMemo, useRef, useState } from "react";
import { evaluateExpression } from "./evaluate";
import { FunctionList } from "./functions-list";
import { OutSystemsLang } from "./os-lang";
import { VariablesPanel } from "./variables-panel";

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
    <div className="">
      <label className="font-sm py-1 font-semibold">
        OutSystems / Expression Editor
      </label>

      <div className="h-96 flex gap-x-2">
        <div className="h-full flex-1">
          <CodeEditor
            language="outsystems"
            customLanguages={[OutSystemsLang]}
            value={outsystemsCode}
            onChange={setOutsystemsCode}
            onEditorMount={(editor) => (editorRef.current = editor)}
          />
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
      <div className="bg-slate-400 rounded-md h-28 mt-2 px-3 py-2 relative">
        <span className="absolute top-0 right-0 px-2 py-1 text-sm font-semibold bg-inherit">
          Final result
        </span>
        <pre className="whitespace-pre-wrap">
          {evaluation.error ? (
            <p className="text-red-900">Error: {evaluation.error}</p>
          ) : (
            evaluation.text ?? (
              <p className="text-slate-200">
                Type something in the code editor above.
              </p>
            )
          )}
        </pre>
      </div>

      <Accordion type="single" collapsible className="mt-8">
        <AccordionItem value="item-1">
          <AccordionTrigger className="py-1">Extra for nerds</AccordionTrigger>
          <AccordionContent>
            <div className="bg-slate-400 rounded-md min-h-28 px-3 py-2 relative">
              <span className="absolute top-0 right-0 px-2 py-1 text-sm font-semibold bg-inherit">
                Transpiled Javascript
              </span>
              <pre>
                {evaluation.javascript}
                {evaluation.javascript === "" && (
                  <p className="text-slate-200">
                    Type something in the code editor above.
                  </p>
                )}
              </pre>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
