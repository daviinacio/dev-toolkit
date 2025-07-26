import { ScrollArea } from "@/components/ui/scroll-area";
import { OutSystemsLang, OutSystemsLangFunction } from "./os-lang";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FunctionSquareIcon } from "lucide-react";
import { spacedCapitalize } from "common/lib/utils";

export function FunctionList() {
  return (
    <div className="flex flex-col h-full bg-slate-700 w-64 rounded-md text-white pl-3 pr-0.5 py-2">
      <h3 className="font-bold">Built-in functions</h3>

      <div className="flex-1">
        <ScrollArea fit>
          <div className="text-sm grid gap-y-1 mt-2">
            {Object.entries(
              Object.groupBy<string, OutSystemsLangFunction>(
                OutSystemsLang.functions,
                ({ group }) => group || ""
              )
            )
              .filter(([group]) => group !== "")
              .map(([group, funcs]) => (
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
                                <div className="hover:underline cursor-pointer truncate">
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
                                <strong>
                                  {spacedCapitalize(fn.returnType)}
                                </strong>
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
                                          data type{" "}
                                          <strong>
                                            {spacedCapitalize(param.type)}
                                          </strong>
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
        </ScrollArea>
      </div>
    </div>
  );
}
