import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodeEditor } from "@/components/ui/code-editor";
import { transpileCustomCodeToJavascript } from "@/lib/custom-lang";
import { useEffect, useState } from "react";
import { FunctionList } from "./functions-list";
import { OutSystemsLang } from "./os-lang";
import { dateTimeToString } from "common/lib/utils";

export default function OutSystemsExpression_ToolPage() {
  const [refresh, setRefresh] = useState(false);

  const [outsystemsCode, setOutsystemsCode] = useState<string>();
  const [transpiledJavascript, setTranspiledJavascript] = useState("");
  const [result, setResult] = useState<string>();

  useEffect(() => {
    if (["CurrDateTime()"].every((it) => !outsystemsCode?.includes(it))) return;

    const interval = setInterval(() => {
      setRefresh((p) => !p);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [outsystemsCode]);

  useEffect(() => {
    const jsCode = transpileCustomCodeToJavascript(
      OutSystemsLang,
      outsystemsCode || ""
    );
    setTranspiledJavascript(jsCode);

    try {
      const result = new Function(`
        const window = undefined;
        ${jsCode}
      `)();

      if (
        typeof result === "string" ||
        (typeof result === "number" && !Number.isNaN(result))
      ) {
        setResult(String(result));
      } else if (typeof result === "object" && result instanceof Date) {
        setResult(`#${dateTimeToString(result)}#`);
      } else if (typeof result === "boolean") {
        setResult(result ? "True" : "False");
      } else {
        setResult(undefined);
      }
    } catch (err) {
      console.debug(err);
      setResult(undefined);
    }
  }, [outsystemsCode, refresh]);

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
          />
        </div>
        <FunctionList />
      </div>
      <div className="bg-slate-400 rounded-md h-28 mt-2 px-3 py-2 relative">
        <span className="absolute top-0 right-0 px-2 py-1 text-sm font-semibold bg-inherit">
          Final result
        </span>
        <pre className="whitespace-pre-wrap">
          {/* {result || ""} */}
          {result ?? (
            <p className="text-slate-200">
              Type something in the code editor above.
            </p>
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
                {transpiledJavascript}
                {transpiledJavascript === "" && (
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
