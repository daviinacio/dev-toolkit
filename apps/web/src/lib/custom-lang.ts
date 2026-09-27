type ParameterTypes =
  | "Text"
  | "Decimal"
  | "Integer"
  | "Date"
  | "DateTime"
  | "Time"
  | "Boolean"
  | "GenericType"
  | "Currency"
  | "LongInteger"
  | "Identifier"
  | "LongIntegerIdentifier"
  | "TextIdentifier"
  | "Object"
  | "BinaryData";

const defaultValue: Record<ParameterTypes, string> = {
  Text: '""',
  Decimal: "0",
  Integer: "0",
  Date: "#1900-01-01#",
  DateTime: "#1900-01-01 00:00:00#",
  Time: "#00:00:00#",
  Boolean: "False",
  GenericType: "",
  Currency: "0",
  LongInteger: "0",
  Identifier: "0",
  LongIntegerIdentifier: "0",
  TextIdentifier: '""',
  Object: "null",
  BinaryData: "null",
};

export type CustomLanguageFunction = {
  label: string;
  description?: string | Array<string>;
  parameters?: Array<{
    name: string;
    type: ParameterTypes;
    description?: string;
    mandatory?: boolean;
    defaultValue?: string;
  }>;
  jsParser: (params: Array<string>) => string;
  returnType: ParameterTypes;
  examples?: Array<string>;
  javascriptDependency?: string;
};

export type CustomLanguage = {
  id: string;
  functions?: Array<CustomLanguageFunction>;
  keywords?: Array<{
    label: string;
    insertText: string;
  }>;
  literals?: Array<CustomLanguageLiteral>;
  operators?: Array<CustomLanguageOperator>;
  lineComment?: string;
};

export type CustomLanguageLiteral = {
  /** Must be anchored with `^`: it is tested against the rest of the expression */
  pattern: RegExp;
  jsParser: (match: RegExpExecArray) => string;
  javascriptDependency?: string;
};

export type CustomLanguageOperator = {
  /** Word symbols (e.g. "and") are matched case-insensitively */
  symbol: string;
  /**
   * Higher binds tighter, e.g. `*` > `+` > `=`.
   * A prefix operator applies to everything that binds tighter than it:
   * with `not` below `=`, `not a = b` is `not (a = b)`.
   */
  precedence: number;
  javascriptDependency?: string;
} & (
  | {
      prefix?: false;
      /** Defaults to `left symbol right` */
      jsParser?: (left: string, right: string) => string;
    }
  | {
      prefix: true;
      /** Defaults to `symbol operand` */
      jsParser?: (operand: string) => string;
    }
);

export function isValidParameter(text: string): boolean {
  text = text;
  return true;
}

export function transpileCustomCodeToJavascript(
  lang: CustomLanguage,
  snippet: string
): string {
  const dependencies = new Set<string>();

  let transpiled: string;
  try {
    transpiled = transpileExpression(lang, snippet, dependencies);
  } catch (err) {
    if (!(err instanceof TranspileError)) throw err;
    // Surface syntax errors when the code runs, like any other runtime error
    return `// Transpile error\r\nthrow new Error(${JSON.stringify(err.message)})`;
  }

  const dependencyCode = [...dependencies]
    .map((dependency) => `${dependency};\r\n`)
    .join("");

  return `${
    dependencyCode !== "" ? `// Dependencies\r\n${dependencyCode}\r\n` : ""
  }// Transpiled Code\r\nreturn (${transpiled})`;
}

class TranspileError extends Error {}

type Token =
  | { kind: "code"; text: string } // strings, numbers and literals, already in JS
  | { kind: "identifier"; text: string }
  | { kind: "operator"; text: string }
  | { kind: "punctuation"; text: "(" | ")" | "," };

function tokenize(lang: CustomLanguage, input: string, dependencies: Set<string>) {
  const tokens: Token[] = [];
  // Longest symbols first, so "<>" and "<=" win over "<"
  const operators = [...(lang.operators || [])].sort(
    (a, b) => b.symbol.length - a.symbol.length
  );
  let i = 0;

  while (i < input.length) {
    const rest = input.slice(i);
    const char = input[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (lang.lineComment && rest.startsWith(lang.lineComment)) {
      const end = input.indexOf("\n", i);
      i = end === -1 ? input.length : end;
      continue;
    }

    // Language literals come first, so a language can define its own text syntax
    const literal = (lang.literals || [])
      .map((it) => ({ it, match: it.pattern.exec(rest) }))
      .find(({ match }) => match);
    if (literal?.match) {
      if (literal.it.javascriptDependency)
        dependencies.add(literal.it.javascriptDependency);
      tokens.push({ kind: "code", text: literal.it.jsParser(literal.match) });
      i += literal.match[0].length;
      continue;
    }

    if (char === '"' || char === "'") {
      let end = i + 1;
      while (end < input.length && !(input[end] === char && input[end - 1] !== "\\"))
        end++;
      if (end >= input.length) throw new TranspileError("Unterminated text literal");
      tokens.push({ kind: "code", text: input.slice(i, end + 1) });
      i = end + 1;
      continue;
    }

    const number = /^\d+(\.\d+)?/.exec(rest);
    if (number) {
      tokens.push({ kind: "code", text: number[0] });
      i += number[0].length;
      continue;
    }

    const identifier = /^[a-zA-Z_][\w.]*/.exec(rest);
    if (identifier) {
      const word = identifier[0];
      // Word operators such as "and" are case-insensitive, like the rest of the language
      const isOperator = operators.some(
        (op) => op.symbol.toLowerCase() === word.toLowerCase()
      );
      tokens.push({ kind: isOperator ? "operator" : "identifier", text: word });
      i += word.length;
      continue;
    }

    const operator = operators.find(
      (op) => !/^\w/.test(op.symbol) && rest.startsWith(op.symbol)
    );
    if (operator) {
      tokens.push({ kind: "operator", text: operator.symbol });
      i += operator.symbol.length;
      continue;
    }

    if (char === "(" || char === ")" || char === ",") {
      tokens.push({ kind: "punctuation", text: char });
      i++;
      continue;
    }

    throw new TranspileError(`Unexpected character '${char}'`);
  }

  return tokens;
}

/** Precedence-climbing parser that emits JS while it parses */
function transpileExpression(
  lang: CustomLanguage,
  input: string,
  dependencies: Set<string>
): string {
  const tokens = tokenize(lang, input, dependencies);
  const functions = new Map(
    (lang.functions || []).map((f) => [f.label.toLowerCase(), f])
  );
  // The same symbol can be both binary and prefix, e.g. "-"
  const findOperator = (token: Token | undefined, prefix: boolean) =>
    token?.kind === "operator"
      ? (lang.operators || []).find(
          (op) =>
            !!op.prefix === prefix &&
            op.symbol.toLowerCase() === token.text.toLowerCase()
        )
      : undefined;
  let pos = 0;

  const peek = () => tokens[pos] as Token | undefined;
  const isPunctuation = (text: string) => {
    const token = peek();
    return token?.kind === "punctuation" && token.text === text;
  };
  const expect = (text: string) => {
    if (!isPunctuation(text))
      throw new TranspileError(
        `Expected '${text}' but found ${peek() ? `'${peek()!.text}'` : "end of expression"}`
      );
    pos++;
  };

  function parseBinary(minPrecedence: number): string {
    let left = parsePrefix();

    for (;;) {
      const operator = findOperator(peek(), false);
      if (!operator || operator.prefix || operator.precedence < minPrecedence)
        return left;
      pos++;

      // precedence + 1 makes operators left-associative: a - b - c = (a - b) - c
      const right = parseBinary(operator.precedence + 1);
      if (operator.javascriptDependency)
        dependencies.add(operator.javascriptDependency);
      left = operator.jsParser
        ? operator.jsParser(left, right)
        : `${left} ${operator.symbol} ${right}`;
    }
  }

  function parsePrefix(): string {
    const operator = findOperator(peek(), true);
    if (!operator?.prefix) return parsePrimary();
    pos++;

    const operand = parseBinary(operator.precedence);
    if (operator.javascriptDependency)
      dependencies.add(operator.javascriptDependency);
    return operator.jsParser
      ? operator.jsParser(operand)
      : `${operator.symbol}${operand}`;
  }

  function parsePrimary(): string {
    const token = peek();
    if (!token) throw new TranspileError("Unexpected end of expression");
    pos++;

    if (token.kind === "code") return token.text;

    if (token.kind === "punctuation" && token.text === "(") {
      const inner = parseBinary(0);
      expect(")");
      return `(${inner})`;
    }

    if (token.kind === "identifier") {
      if (!isPunctuation("(")) return token.text;
      pos++;

      const args: string[] = [];
      if (!isPunctuation(")")) {
        do args.push(parseBinary(0));
        while (isPunctuation(",") && ++pos);
      }
      expect(")");

      const func = functions.get(token.text.toLowerCase());
      if (!func) return `${token.text}(${args.join(", ")})`;

      if (func.javascriptDependency) dependencies.add(func.javascriptDependency);
      // Fill missing mandatory arguments with their default value
      const finalArgs = (func.parameters || []).map((paramDef, idx) =>
        args[idx] != null
          ? args[idx]
          : paramDef.mandatory
          ? transpileExpression(
              lang,
              paramDef.defaultValue || defaultValue[paramDef.type],
              dependencies
            )
          : ""
      );
      return func.jsParser(finalArgs);
    }

    throw new TranspileError(`Unexpected '${token.text}'`);
  }

  if (tokens.length === 0) return "";
  const js = parseBinary(0);
  if (peek()) throw new TranspileError(`Unexpected '${peek()!.text}'`);
  return js;
}
