import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodeEditor } from "@/components/ui/code-editor";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { transpileCustomCodeToJavascript } from "@/lib/custom-lang";
import { FunctionSquareIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { OutSystemsLang, OutSystemsLangFunction } from "./os-lang";

export default function OutSystemsExpression_ToolPage() {
  const [refresh, setRefresh] = useState(false);

  const [outsystemsCode, setOutsystemsCode] = useState<string>();
  const [transpiledJavascript, setTranspiledJavascript] = useState("");
  const [result, setResult] = useState("");

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
      setResult(String(eval(jsCode) ?? "").trim());
    } catch (err) {
      console.debug(err);
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
        <div className="h-full bg-slate-700 w-64 rounded-md text-white px-3 py-2">
          <h3 className="font-bold">Built-in functions</h3>

          <div className="text-sm grid gap-y-1 mt-2">
            {Object.entries(
              Object.groupBy<string, OutSystemsLangFunction>(
                OutSystemsLang.functions,
                ({ group }) => group
              )
            ).map(([group, funcs]) => (
              <div key={group}>
                <div className="font-bold">{group}</div>
                <ul>
                  {funcs &&
                    funcs.map((fn) => (
                      <li key={fn.label}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-x-1">
                              <FunctionSquareIcon size={18} />
                              <div className="hover:underline cursor-pointer">
                                {fn.label}
                                {`(${(fn.parameters || [])
                                  .map((param) => param.name)
                                  .join(", ")})`}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            className="max-w-[500px] grid"
                            side="right"
                            sideOffset={12}
                          >
                            <div>
                              <strong>{fn.label}</strong> function : data type{" "}
                              <strong>{fn.returnType}</strong>
                            </div>
                            <div className="whitespace-break-spaces italic">
                              {fn.description}
                            </div>
                            {fn.parameters && fn.parameters.length > 0 && (
                              <div className="mt-2">
                                Inputs:
                                <ul>
                                  {(fn.parameters || []).map((param) => (
                                    <li className="ml-2" key={param.name}>
                                      <div>
                                        <strong>{param.name}</strong>
                                        {param.mandatory && " : mandatory"};
                                        data type <strong>{param.type}</strong>
                                      </div>
                                      <div className="ml-2 italic">
                                        {param.description}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {fn.examples && fn.examples.length > 0 && (
                              <div className="mt-2">
                                Examples:
                                {fn.examples.map((ex, i) => (
                                  <div key={i}>{ex}</div>
                                ))}
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-slate-400 rounded-md h-28 mt-2 px-3 py-2 relative">
        <span className="absolute top-1 right-2 text-sm font-semibold">
          Final result
        </span>
        {result}
        {result === "" && (
          <p className="text-slate-200">
            Type something in the code editor above.
          </p>
        )}
      </div>

      <Accordion type="single" collapsible className="mt-8">
        <AccordionItem value="item-1">
          <AccordionTrigger className="py-1">Extra for nerds</AccordionTrigger>
          <AccordionContent>
            <div className="bg-slate-400 rounded-md min-h-28 px-3 py-2 relative">
              <span className="absolute top-1 right-2 text-sm font-semibold">
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
