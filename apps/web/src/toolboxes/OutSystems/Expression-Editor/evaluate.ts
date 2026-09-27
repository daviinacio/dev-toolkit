import { transpileCustomCode } from "@/lib/custom-lang";
import { formatOutSystemsDate, OutSystemsDateType, OutSystemsLang } from "./os-lang";

export type Evaluation = {
  javascript: string;
  /** Variables used by the expression, in order of appearance */
  variables: Array<string>;
  /** The result as OutSystems would show it, e.g. `"text"` -> text, `#2015-05-21#`, True */
  text?: string;
  /** The OutSystems data type of the result, e.g. Text, Integer or Date */
  type?: string;
  error?: string;
};

/** Transpiles and runs an OutSystems expression, using test values for its variables */
export function evaluateExpression(
  code: string,
  variableValues: Record<string, string> = {}
): Evaluation {
  const { javascript, variables } = transpileCustomCode(
    OutSystemsLang,
    code,
    variableValues
  );
  if (code.trim() === "") return { javascript: "", variables };

  let value: unknown;
  try {
    value = new Function(`
      const window = undefined;
      ${javascript}
    `)();
  } catch (err) {
    return {
      javascript,
      variables,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (typeof value === "number" && !Number.isFinite(value))
    return { javascript, variables, error: "The result is not a valid number" };

  return { javascript, variables, ...describeValue(value) };
}

function describeValue(value: unknown): Pick<Evaluation, "text" | "type"> {
  if (typeof value === "string") return { text: value, type: "Text" };
  if (typeof value === "boolean")
    return { text: value ? "True" : "False", type: "Boolean" };
  if (typeof value === "number")
    return {
      text: String(value),
      type: Number.isInteger(value) ? "Integer" : "Decimal",
    };
  if (value instanceof Date)
    return {
      text: formatOutSystemsDate(value),
      type: (value as Date & { __osType?: OutSystemsDateType }).__osType ?? "DateTime",
    };
  if (value === null || value === undefined) return { text: "", type: "Object" };
  return { text: String(value) };
}
