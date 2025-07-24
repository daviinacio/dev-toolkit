import { TextareaProps } from "@/components/ui/textarea";
import { CustomLanguage } from "@/lib/custom-lang";
// import { usePreference } from "@/hooks/use-preference";
// import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import Editor, { Monaco, useMonaco } from "@monaco-editor/react";
import { NewLine } from "common/lib/utils";
import { useCallback, useEffect, useRef } from "react";
// import Color from "color";

export type CodeEditorProps = Omit<TextareaProps, "onChange"> & {
  onChange?: (value?: string) => void;
  language?: string;
  customLanguages?: CustomLanguage[];
  typescriptDefinition?: string;
};

export function CodeEditor({
  defaultValue,
  value,
  language = "javascript",
  customLanguages = [],
  typescriptDefinition,
  className,
  ...props
}: CodeEditorProps) {
  // const theme = useTheme();
  const monaco = useMonaco() as Monaco;
  const editorRef = useRef(null);
  // const preferences = usePreference();
  // const currentColorPrimary = Color(
  //   `hsl(${preferences.getItem("color-primary")})`
  // );

  const validateCode = useCallback(() => {
    const editor = editorRef.current;
    // console.log("test", editor, monaco);
    if (!editor || !monaco) return;

    // // @ts-ignore
    // const model = editor.getModel();
    // const code = model.getValue();

    // const markers = [];

    // // 🧠 VERY BASIC PARSER: Detect Length() usage
    // for (let lang of customLanguages) {
    //   for (let func of lang.functions || []) {
    //     const regex = new RegExp(`${func.label}\s*\(([^)]*)\)`, "g");
    //     let match;
    //     while ((match = regex.exec(code))) {
    //       const param = match[1].trim();
    //       const paramIsString =
    //         /^".*"$/.test(param) || /^[a-zA-Z_][\w.]*$/.test(param); // crude string or variable check

    //       if (!paramIsString) {
    //         markers.push({
    //           severity: monaco.MarkerSeverity.Warning,
    //           message: `Function 'Length' expects a string parameter.`,
    //           startLineNumber: code.substring(0, match.index).split("\n")
    //             .length,
    //           startColumn: match[0].indexOf("(") + 1,
    //           endLineNumber: code.substring(0, match.index).split("\n").length,
    //           endColumn: match[0].length + 1,
    //         });
    //       }
    //     }
    //   }
    // }

    // monaco.editor.setModelMarkers(model, "outsystems-linter", markers);
  }, [customLanguages, monaco]);

  useEffect(() => {
    if (!monaco) return;
    monaco.editor.defineTheme("editor-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        // "editor.selectionBackground": currentColorPrimary.alpha(0.32).hexa(),
        // "editor.selectionHighlight": currentColorPrimary.hexa(),
        // "editor.background": "#09090b",
      },
    });

    monaco.editor.defineTheme("editor-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#ffffff",
      },
    });

    try {
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        typescriptDefinition,
        "myDefault:some.file.d.ts"
      );
    } catch (err) {}

    try {
      for (let lang of customLanguages) {
        monaco.languages.register({ id: lang.id });

        // 2. Define tokens (very basic sample here)
        monaco.languages.setMonarchTokensProvider(lang.id, {
          tokenizer: {
            root: [
              // "\\bIf\\b|\\bThen\\b|\\bElse\\b"
              [
                new RegExp(
                  [...(lang.functions || []), ...(lang.keywords || [])]
                    .map((it) => `\\b${it.label}\\b`)
                    .join("|")
                ),
                "keyword",
              ],
              [/\bTrue\b|\bFalse\b/, "constant"],
              [/\b\w+(?=\()/, "function"], // e.g. IsNull()
              [/[a-zA-Z_]\w*/, "identifier"],
              [/\d+/, "number"],
              [/".*?"/, "string"],
              // Operators
              [/<>|<=|>=|=|<|>|\+|\-|\*|\/|%/, "operator"],
              // Parentheses
              [/[()]/, "@brackets"],
              // Comments (if needed)
              [/\/\/.*$/, "comment"],
            ],
          },
        });

        // 3. Optional: set basic config (e.g. comments)
        monaco.languages.setLanguageConfiguration("outsystems", {
          comments: {
            lineComment: lang.lineComment || "//",
          },
        });

        // 4. Add autocomplete
        monaco.languages.registerCompletionItemProvider("outsystems", {
          provideCompletionItems: () => {
            const suggestions = [
              ...(lang.functions || []).map((fn) => ({
                label: `${fn.label}()`,
                detail: "",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: `${fn.label}(${(fn.parameters || [])
                  .map(({ name }, i) => "$" + `{${i + 1}:${name}}`)
                  .join(", ")})`,
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                ...(fn.description && {
                  documentation: {
                    expand: true,
                    kind: "markdown",
                    value: `**${fn.label}** function : data type **${
                      fn.returnType
                    }**${NewLine}${
                      (typeof fn.description === "string"
                        ? [fn.description]
                        : fn.description
                      )
                        .map((d) => `*${d.trim()}*`)
                        .join(NewLine) || ""
                    }${NewLine + NewLine}${
                      (fn.parameters &&
                        fn.parameters.length > 0 &&
                        ` Inputs:${NewLine}${(fn.parameters || [])
                          .map(
                            (param) =>
                              `  **${param.name}**${
                                param.mandatory ? " : mandatory" : ""
                              }; data type: **${param.type}**${
                                (param.description &&
                                  `${NewLine}    *${param.description}*`) ||
                                ""
                              }`
                          )
                          .join(NewLine)}`) ||
                      ""
                    }${NewLine}${
                      (fn.examples &&
                        fn.examples.length > 0 &&
                        `${NewLine}Examples:${NewLine}${fn.examples.join(
                          NewLine
                        )}`) ||
                      ""
                    }`,
                  },
                }),
              })),
              ...(lang.keywords || []).map((keyword) => ({
                label: keyword.label,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: keyword.insertText,
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              })),
            ];

            return { suggestions };
          },
        });
      }
    } catch (err) {}
  }, [monaco]);

  if (!monaco) return;

  return (
    <div
      className="inline"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onInput={(e) => e.stopPropagation()}
    >
      <Editor
        {...props}
        onChange={(e) => {
          validateCode();
          return props.onChange && props.onChange(e);
        }}
        value={typeof value == "string" ? value : ""}
        defaultValue={typeof defaultValue == "string" ? defaultValue : ""}
        language={language}
        theme={/*theme.isDarkMode*/ true ? "editor-dark" : "editor-light"}
        className={cn(
          //"ring ring-primary rounded-sm overflow-hidden",
          "transition-colors",
          "border border-input shadow-sm rounded-md overflow-hidden",
          // "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
          "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring",
          "group-[.field-warning]:border-warning group-[.field-warning]:focus:ring-warning",
          "group-[.field-error]:border-destructive group-[.field-error]:focus:ring-destructive",
          "group-[.field-error]:border-destructive group-[.field-error]:has-[:focus-visible]:ring-destructive",
          className
        )}
        options={{
          ligature: true,
          tabSize: 2,
          inlineSuggest: true,
          fontSize: "14px",
          formatOnType: true,
          autoClosingBrackets: true,
          minimap: { enabled: false },
        }}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
      />
    </div>
  );
}
