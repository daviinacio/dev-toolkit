type ParameterTypes = "String" | "Decimal" | "Integer";

export type CustomLanguageFunction = {
  label: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: ParameterTypes;
    description?: string;
    mandatory?: boolean;
  }>;
  jsParser: (params: Array<string>) => string;
  returnType: ParameterTypes;
  examples?: Array<string>;
};

export type CustomLanguage = {
  id: string;
  functions?: Array<CustomLanguageFunction>;
  keywords?: Array<{
    label: string;
    insertText: string;
  }>;
  lineComment?: string;
};

export function transpileCustomCodeToJavascript(
  lang: CustomLanguage,
  snippet: string
) {
  let result = snippet;

  for (let func of lang.functions || []) {
    const pattern = new RegExp(`\\b${func.label}\\s*\\(([^)]*)\\)`, "gi");

    result = result.replace(pattern, (_, args: string) => {
      const params = args
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      return func.jsParser(params);
    });
  }

  return result;
}
