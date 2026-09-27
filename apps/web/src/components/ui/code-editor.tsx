import { TextareaProps } from "@/components/ui/textarea";
import { CustomLanguage, functionSnippet } from "@/lib/custom-lang";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";
import Editor, { Monaco, OnMount, useMonaco } from "@monaco-editor/react";
import { NewLine, spacedCapitalize, Tabulation } from "common/lib/utils";
import { useCallback, useEffect, useRef } from "react";
// import Color from "color";

export type CodeEditorProps = Omit<TextareaProps, "onChange"> & {
  onChange?: (value?: string) => void;
  language?: string;
  customLanguages?: CustomLanguage[];
  typescriptDefinition?: string;
  /** Gives access to the Monaco instance, e.g. to insert text at the cursor */
  onEditorMount?: (editor: CodeEditorInstance) => void;
};

export type CodeEditorInstance = Parameters<OnMount>[0];

// Colors from the design (modules/design-figma)
const editorDarkColors = {
  "editor.background": "#0f1012",
  "editor.lineHighlightBackground": "#161719",
  "editor.lineHighlightBorder": "#161719",
  "editorLineNumber.foreground": "#5f6368",
  "editorLineNumber.activeForeground": "#9aa0a6",
  "editorCursor.foreground": "#b8ff57",
  "editor.selectionBackground": "#b8ff5733",
  "editorWidget.background": "#161719",
  "editorWidget.border": "#2a2c30",
  "editorSuggestWidget.background": "#161719",
  "editorSuggestWidget.border": "#2a2c30",
  "editorSuggestWidget.selectedBackground": "#1e2022",
  "editorHoverWidget.background": "#161719",
  "editorHoverWidget.border": "#2a2c30",
  // muted-foreground: 6.8:1 on the suggestions background (#5f6368 was only 3:1)
  "symbolIcon.functionForeground": "#9aa0a6",
};

// The same roles with the light theme tokens (style/global.css)
const editorLightColors = {
  "editor.background": "#ffffff",
  "editor.lineHighlightBackground": "#f1f2f4",
  "editor.lineHighlightBorder": "#f1f2f4",
  "editorLineNumber.foreground": "#9aa0a6",
  "editorLineNumber.activeForeground": "#5f6368",
  "editorCursor.foreground": "#4d7c0f",
  "editor.selectionBackground": "#4d7c0f33",
  "editorWidget.background": "#ffffff",
  "editorWidget.border": "#d4d7dc",
  "editorSuggestWidget.background": "#ffffff",
  "editorSuggestWidget.border": "#d4d7dc",
  "editorSuggestWidget.selectedBackground": "#f1f2f4",
  "editorHoverWidget.background": "#ffffff",
  "editorHoverWidget.border": "#d4d7dc",
  // muted-foreground: 6:1 on white
  "symbolIcon.functionForeground": "#5f6368",
};

export function CodeEditor({
  defaultValue,
  value,
  language = "javascript",
  customLanguages = [],
  typescriptDefinition,
  className,
  onEditorMount,
  ...props
}: CodeEditorProps) {
  const { isDarkMode } = useTheme();
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
      colors: editorDarkColors,
    });

    monaco.editor.defineTheme("editor-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: editorLightColors,
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
        // Token names are the ones CustomLanguageTokenColors colors
        const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
        const keywords = (lang.keywords || []).map((it) => escape(it.label));
        monaco.languages.setMonarchTokensProvider(lang.id, {
          // Like the transpiler, names are case-insensitive: if() is If()
          ignoreCase: true,
          tokenizer: {
            root: [
              [new RegExp(`${escape(lang.lineComment || "//")}.*$`), "comment"],
              [/"([^"]|"")*"/, "string"], // "" is a quote inside the Text
              [/"([^"]|"")*$/, "string"], // still being typed
              [/#[^#\r\n]*#/, "date"], // e.g. #2015-05-21#
              [/\b(True|False)\b/, "constant"],
              ...(keywords.length
                ? [[new RegExp(`\\b(${keywords.join("|")})\\b`), "keyword"] as [RegExp, string]]
                : []),
              [/[a-zA-Z_][\w.]*(?=\s*\()/, "function"], // e.g. IsNull()
              [/[a-zA-Z_][\w.]*/, "identifier"], // e.g. GetUsers.List.Current.Name
              [/\d+(\.\d+)?/, "number"],
              [/<>|<=|>=|=|<|>|\+|-|\*|\//, "operator"],
              [/[(),]/, "delimiter"],
            ],
          },
        });

        // The app's editor themes with the language's own text colors
        if (lang.tokenColors) {
          monaco.editor.defineTheme(`${lang.id}-light`, {
            base: "vs",
            inherit: true,
            rules: lang.tokenColors.light,
            colors: editorLightColors,
          });
          monaco.editor.defineTheme(`${lang.id}-dark`, {
            base: "vs-dark",
            inherit: true,
            rules: lang.tokenColors.dark,
            colors: editorDarkColors,
          });
        }

        // 3. Optional: set basic config (e.g. comments)
        monaco.languages.setLanguageConfiguration(lang.id, {
          comments: {
            lineComment: lang.lineComment || "//",
          },
        });

        // 4. Add autocomplete
        monaco.languages.registerCompletionItemProvider(lang.id, {
          provideCompletionItems: () => {
            const suggestions = [
              ...(lang.functions || []).map((fn) => ({
                label: `${fn.label}()`,
                detail: "",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: functionSnippet(fn),
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                ...(fn.description && {
                  documentation: {
                    expand: true,
                    kind: "markdown",
                    value: `**${
                      fn.label
                    }** function : data type **${spacedCapitalize(
                      fn.returnType
                    )}**${NewLine}${
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
                              `${Tabulation}**${param.name}**${
                                param.mandatory ? " : mandatory" : ""
                              }; data type: **${spacedCapitalize(
                                param.type
                              )}**${
                                (param.description &&
                                  `${NewLine}${Tabulation + Tabulation}*${
                                    param.description
                                  }*`) ||
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
        theme={`${
          customLanguages.find((it) => it.id === language)?.tokenColors
            ? language
            : "editor"
        }-${isDarkMode ? "dark" : "light"}`}
        className={cn(
          //"ring ring-primary rounded-sm overflow-hidden",
          "transition-colors",
          "border border-border rounded-lg overflow-hidden",
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
          fontSize: "13px",
          fontFamily: "'JetBrains Mono', monospace",
          formatOnType: true,
          autoClosingBrackets: true,
          minimap: { enabled: false },
        }}
        onMount={(editor) => {
          editorRef.current = editor;
          onEditorMount?.(editor);
        }}
      />
    </div>
  );
}
