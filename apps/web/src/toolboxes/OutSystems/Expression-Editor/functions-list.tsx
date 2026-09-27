import { ScrollArea } from "@/components/ui/scroll-area";
import { OutSystemsLang, OutSystemsLangFunction } from "./os-lang";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FunctionSquareIcon } from "lucide-react";
import { spacedCapitalize } from "common/lib/utils";

export type FunctionListProps = {
  onSelect?: (fn: OutSystemsLangFunction) => void;
};

export function FunctionList({ onSelect }: FunctionListProps) {
  return (
    <div className="flex h-full w-64 flex-col gap-1.5">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Built-in functions
      </h3>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card py-2 pl-3 pr-0.5">
        <div className="flex-1">
          <ScrollArea fit>
            <div className="grid gap-y-1">
              {Object.entries(
                Object.groupBy<string, OutSystemsLangFunction>(
                  OutSystemsLang.functions,
                  ({ group }) => group || "",
                ),
              )
                .filter(([group]) => group !== "")
                .map(([group, funcs]) => (
                  <div key={group}>
                    <div className="mb-0.5 mt-2 font-mono text-[10px] uppercase tracking-widest text-primary/70">
                      {group}
                    </div>
                    <ul>
                      {funcs &&
                        funcs.map((fn) => (
                          <li key={fn.label}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-x-1.5 text-left font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                                  onClick={() => onSelect?.(fn)}
                                >
                                  <FunctionSquareIcon
                                    size={14}
                                    className="shrink-0 text-faint"
                                  />
                                  <div className="truncate">
                                    {fn.label}
                                    {`(${(fn.parameters || [])
                                      .map((param) => param.name)
                                      .join(", ")})`}
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                className="max-w-[500px] grid"
                                side="right"
                                sideOffset={12}
                              >
                                <div>
                                  <strong>{fn.label}</strong> function : data
                                  type{" "}
                                  <strong>
                                    {spacedCapitalize(fn.returnType)}
                                  </strong>
                                </div>
                                <div className="whitespace-break-spaces italic">
                                  {(typeof fn.description === "string"
                                    ? [fn.description]
                                    : fn.description || []
                                  ).map((line, i) => (
                                    <div key={i}>{line}</div>
                                  ))}
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
                                            {(typeof param.description ===
                                            "string"
                                              ? [param.description]
                                              : param.description || []
                                            ).map((line, i) => (
                                              <div key={i}>{line}</div>
                                            ))}
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
    </div>
  );
}
