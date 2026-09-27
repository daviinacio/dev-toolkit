import {
  CustomLanguage,
  CustomLanguageFunction,
  CustomLanguageLiteral,
  CustomLanguageTokenColors,
  CustomLanguageOperator,
} from "@/lib/custom-lang";
import { dateTimeToString, NewLine } from "common/lib/utils";

export type OutSystemsLangFunction = CustomLanguageFunction & {
  group?: string;
};

export type OutSystemsDateType = "Date" | "Time" | "DateTime";

/**
 * Dates are stored as the wall-clock value in UTC (read them with getUTC*).
 * `__osType` keeps the OutSystems type, since a JS Date can't tell a Date from a Time.
 */
const DateRuntime = `const __osDate = (value, type) => Object.defineProperty(new Date(value), "__osType", { value: type });
// Returns null when the parts don't form a valid date (Feb 30, 25h...) instead of rolling over like Date.UTC
const __osBuildDate = (type, year, month, day, hour = 0, minute = 0, second = 0) => {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day &&
    date.getUTCHours() === hour && date.getUTCMinutes() === minute && date.getUTCSeconds() === second;
  return valid ? __osDate(date.getTime(), type) : null;
};
// Like .NET: when the target month is shorter, the day becomes its last day (Jan 31 + 1 month = Feb 29)
const __osAddMonths = (dt, months) => {
  const year = dt.getUTCFullYear();
  const month = dt.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return __osDate(Date.UTC(year, month, Math.min(dt.getUTCDate(), lastDay),
    dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds()), "DateTime");
};
const __osDateText = (dt, type) => {
  const [date, time] = dt.toISOString().split(".")[0].split("T");
  return type === "Date" ? date : type === "Time" ? time : date + " " + time;
};
const __osDatePart = (dt, type = "Date") =>
  __osDate(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()), type);
const __osTimePart = (dt) =>
  __osDate(Date.UTC(1900, 0, 1, dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds()), "Time");
// Accepts yyyy-MM-dd, yyyy/MM/dd or yyyy.MM.dd, optionally followed by HH:mm:ss (or just HH:mm:ss for a Time)
const __osParseDateText = (text, type) => {
  text = String(text).trim();
  if (type === "Time") {
    const time = /^(\\d{1,2}):(\\d{1,2}):(\\d{1,2})$/.exec(text);
    return time ? __osBuildDate("Time", 1900, 1, 1, +time[1], +time[2], +time[3]) : null;
  }
  const match = /^(\\d{4})([-\\/.])(\\d{1,2})\\2(\\d{1,2})(?: (\\d{1,2}):(\\d{1,2}):(\\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const [, year, , month, day, hour = 0, minute = 0, second = 0] = match;
  const date = __osBuildDate("DateTime", +year, +month, +day, +hour, +minute, +second);
  if (!date || date.getUTCFullYear() < 1900) return null;
  return type === "Date" ? __osDatePart(date) : date;
}`;

/**
 * Implicit conversion to Text, e.g. `"Year: " + 2015` or `"Day: " + #2015-05-21#`.
 * `+` adds numbers, concatenates when either side is Text and rejects anything else.
 */
const TextRuntime = `const __osText = (value) => {
  if (typeof value === "boolean") return value ? "True" : "False";
  // Dates only exist when DateRuntime is loaded, since they all come from __osDate
  if (value instanceof Date) return __osDateText(value, value.__osType);
  // Decimals never use exponent notation: 0.0000001, not 1e-7
  if (typeof value === "number" && /e/.test(String(value)))
    return value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 });
  return String(value);
};
const __osAdd = (a, b) => {
  if (typeof a === "string" || typeof b === "string") return __osText(a) + __osText(b);
  if (typeof a === "number" && typeof b === "number") return a + b;
  throw new Error("Invalid data types for '+': " + __osText(a) + " + " + __osText(b));
}`;

/** Returns the OutSystems text of a Date produced by the transpiled code */
export function formatOutSystemsDate(value: Date) {
  const type = (value as Date & { __osType?: OutSystemsDateType }).__osType;
  const [date, time] = dateTimeToString(value).split(" ");
  return `#${type === "Date" ? date : type === "Time" ? time : `${date} ${time}`}#`;
}

function parseDateLiteral(text: string): string | null {
  // #yyyy-MM-dd#, #HH:mm:ss# or #yyyy-MM-dd HH:mm:ss#
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})(?: (?=.)|$)/.exec(text);
  const timeText = dateMatch ? text.slice(dateMatch[0].length) : text;
  const timeMatch = /^(\d{2}):(\d{2}):(\d{2})$/.exec(timeText);
  if (timeText !== "" && !timeMatch) return null;
  if (!dateMatch && !timeMatch) return null;

  const type: OutSystemsDateType =
    dateMatch && timeMatch ? "DateTime" : dateMatch ? "Date" : "Time";

  // Time values have no date part in OutSystems: they sit on the null date
  const [y, mo, d] = dateMatch ? dateMatch.slice(1, 4).map(Number) : [1900, 1, 1];
  const [h, mi, s] = timeMatch ? timeMatch.slice(1, 4).map(Number) : [0, 0, 0];
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi, s));

  // Date.UTC silently rolls invalid values over (e.g. Feb 30 -> Mar 2)
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d ||
    date.getUTCHours() !== h ||
    date.getUTCMinutes() !== mi ||
    date.getUTCSeconds() !== s ||
    y < 1900
  )
    return null;

  return `__osDate("${date.toISOString()}", "${type}")`;
}

/**
 * Moves the decimal point through the text form of the number, since multiplying
 * adds float errors: 0.135 * 100 = 13.500000000000002, while shift(0.135, 2) = 13.5
 */
const NumberRuntime = `const __osShift = (n, digits) => {
  const [mantissa, exponent = "0"] = String(n).split("e");
  return Number(mantissa + "e" + (Number(exponent) + digits));
};
// Round half to even: 2.5 -> 2, 3.5 -> 4, -5.5 -> -6
const __osRoundHalfEven = (n, digits = 0) => {
  const x = __osShift(n, digits);
  const floor = Math.floor(x);
  const rounded = x - floor === 0.5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(x);
  return __osShift(rounded, -digits);
};
// Integer is 32 bits and Long Integer is 64 bits
const __osFitsInteger = (n, bits) => Number.isFinite(n) && n >= -(2 ** (bits - 1)) && n < 2 ** (bits - 1);
// Returns null when the text isn't an integer or doesn't fit; BigInt keeps 64-bit limits exact
const __osParseIntegerText = (text, bits) => {
  text = String(text).trim();
  if (!/^[+-]?\\d+$/.test(text)) return null;
  const value = BigInt(text);
  const limit = 1n << BigInt(bits - 1);
  return value >= -limit && value < limit ? Number(value) : null;
};
// The only decimal separator is "."; the limit is the .NET Decimal maximum
const __osParseDecimalText = (text) => {
  text = String(text).trim();
  if (!/^[+-]?(\\d+(\\.\\d*)?|\\.\\d+)$/.test(text)) return null;
  const value = Number(text);
  return Math.abs(value) <= 79228162514264337593543950335 ? value : null;
};
// Rounds half away from zero, like the application server, and applies the separators.
// The group separator is inserted with a function, so a "$" in it is never read as a pattern.
const __osFormatNumber = (value, digits, decimalSeparator, groupSeparator) => {
  const rounded = __osShift(Math.round(__osShift(Math.abs(value), digits)), -digits);
  const [integer, fraction] = rounded.toFixed(digits).split(".");
  const grouped = integer.replace(/\\B(?=(\\d{3})+(?!\\d))/g, () => groupSeparator);
  return (value < 0 && rounded !== 0 ? "-" : "") + grouped + (fraction ? decimalSeparator + fraction : "");
}`;

/** New lines become <br/>, like the OutSystems examples */
const EncodeHtmlRuntime = `const __osEncodeHtml = (text) =>
  String(text).replace(/\\r\\n|[\\n&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? "<br/>")`;

// Every backslash is doubled: this is JS source inside a template literal
const EncodeJavaScriptRuntime = `const __osEncodeJavaScript = (text) =>
  String(text).replace(/[\\\\'"<>&\\u0000-\\u001f\\u2028\\u2029]/g, (char) => {
    const code = char.charCodeAt(0);
    if (char === "\\\\") return "\\\\\\\\";
    return code > 0xff ? "\\\\u" + code.toString(16).padStart(4, "0") : "\\\\x" + code.toString(16).padStart(2, "0");
  })`;

/** Only [0-9a-zA-Z] is kept, spaces become "+" and every other UTF-8 byte becomes %xx */
const EncodeUrlRuntime = `const __osEncodeUrl = (text) =>
  Array.from(new TextEncoder().encode(String(text)), (byte) => {
    const char = String.fromCharCode(byte);
    if (/[0-9a-zA-Z]/.test(char)) return char;
    return byte === 32 ? "+" : "%" + byte.toString(16).padStart(2, "0");
  }).join("")`;

/**
 * Replaces every pattern in a single pass, so a replaced value is never replaced again
 * (e.g. the "m" and "t" inside a month name). A backslash outputs the next character as is.
 * Every backslash is doubled: this is JS source inside a template literal.
 */
const FormatDateTimeRuntime = `const __osFormatDateTime = (dt, format) => {
  const pad = (n) => String(n).padStart(2, "0");
  const hours = dt.getUTCHours();
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  // Day and month names are always in English, like the OutSystems examples ("Tue, 09 Jun 2015")
  const name = (options) => dt.toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
  const patterns = {
    dddd: () => name({ weekday: "long" }),
    ddd: () => name({ weekday: "short" }),
    dd: () => pad(dt.getUTCDate()),
    d: () => String(dt.getUTCDate()),
    MMMM: () => name({ month: "long" }),
    MMM: () => name({ month: "short" }),
    MM: () => pad(dt.getUTCMonth() + 1),
    M: () => String(dt.getUTCMonth() + 1),
    yyyy: () => String(dt.getUTCFullYear()),
    yy: () => pad(dt.getUTCFullYear() % 100),
    y: () => String(dt.getUTCFullYear() % 100),
    HH: () => pad(hours),
    H: () => String(hours),
    hh: () => pad(hours12),
    h: () => String(hours12),
    mm: () => pad(dt.getUTCMinutes()),
    m: () => String(dt.getUTCMinutes()),
    ss: () => pad(dt.getUTCSeconds()),
    s: () => String(dt.getUTCSeconds()),
    tt: () => (hours >= 12 ? "PM" : "AM"),
    t: () => (hours >= 12 ? "P" : "A"),
  };
  return String(format).replace(
    /\\\\(.)|dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|y|HH|H|hh|h|mm|m|ss|s|tt|t/g,
    (match, escaped) => (escaped !== undefined ? escaped : patterns[match]())
  );
}`;

/** Wall-clock time of the device, stored in UTC like every other date (see DateRuntime) */
function deviceDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}Z`
  );
}

/** JS `===` compares Date objects by reference, OutSystems compares them by value */
const EqualsRuntime = `const __osEquals = (a, b) => a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b`;

// From loosest to tightest: or, and, not, comparisons, + -, * /, unary - +
const Operators: CustomLanguageOperator[] = [
  { symbol: "or", precedence: 0, jsParser: (left, right) => `${left} || ${right}` },
  { symbol: "and", precedence: 1, jsParser: (left, right) => `${left} && ${right}` },
  {
    symbol: "not",
    prefix: true,
    precedence: 2,
    jsParser: (operand) => `!(${operand})`,
  },
  { symbol: "<", precedence: 3 },
  { symbol: ">", precedence: 3 },
  { symbol: "<=", precedence: 3 },
  { symbol: ">=", precedence: 3 },
  {
    symbol: "=",
    precedence: 3,
    jsParser: (left, right) => `__osEquals(${left}, ${right})`,
    javascriptDependency: EqualsRuntime,
  },
  {
    symbol: "<>",
    precedence: 3,
    jsParser: (left, right) => `!__osEquals(${left}, ${right})`,
    javascriptDependency: EqualsRuntime,
  },
  {
    symbol: "+",
    precedence: 4,
    jsParser: (left, right) => `__osAdd(${left}, ${right})`,
    javascriptDependency: TextRuntime,
  },
  { symbol: "-", precedence: 4 },
  { symbol: "*", precedence: 5 },
  { symbol: "/", precedence: 5 },
  { symbol: "-", prefix: true, precedence: 6 },
  { symbol: "+", prefix: true, precedence: 6 },
];

/** OutSystems Text has no backslash escapes: "C:\temp" is literal and a quote is written as "" */
const TextLiteral: CustomLanguageLiteral = {
  pattern: /^"((?:[^"]|"")*)"/,
  jsParser: ([, content]) => JSON.stringify(content.replace(/""/g, '"')),
};

const BooleanLiteral: CustomLanguageLiteral = {
  // The lookahead keeps identifiers such as "TrueValue" or "False.Id" intact
  pattern: /^(true|false)(?![\w.])/i,
  jsParser: ([, value]) => value.toLowerCase(),
};

const DateLiteral: CustomLanguageLiteral = {
  pattern: /^#([^#\r\n]*)#/,
  jsParser: ([literal, content]) =>
    parseDateLiteral(content) ??
    `(() => { throw new Error(${JSON.stringify(`Invalid date literal: ${literal}`)}) })()`,
  javascriptDependency: DateRuntime,
};

/** Template

  {
    label: "",
    description: [
      "",
    ],
    group: "",
    parameters: [],
    examples: [],
    returnType: "Date",
    jsParser: ([value]) => ``
  }

 */

const UncategorizedFunctions: OutSystemsLangFunction[] = [
  {
    label: "If",
    description: [
      "Returns 'true_return' if 'value' is True, otherwise returns 'false_return.",
      "The return data type of the function is the type of 'true_return' unless there's an implicit conversion from 'true_return' type to 'false_return' type.",
      "When there's no implicit type conversion an invalid data type error will occur.",
    ],
    parameters: [
      {
        name: "value",
        type: "Boolean",
        description: "The condition to be evaluated.",
        mandatory: true,
      },
      {
        name: "true_return",
        type: "GenericType",
        description:
          "The expression to be evaluated and returned when the condition is true.",
        mandatory: true,
      },
      {
        name: "false_return",
        type: "GenericType",
        description:
          "The expression to be evaluated and returned when the condition is false.",
        mandatory: true,
      },
    ],
    returnType: "Boolean",
    jsParser: ([value, true_return, false_return]) =>
      `(${value} ? ${true_return} : ${false_return})`,
    examples: [
      "If(countVar = 0, 0, 1/countVar) = 0 when countVar is 0 or 1/countVar when countVar is different from 0.",
      'If(True, 2.34, "xpto") = "2.34"',
      'If(False, "xp", #2016-05-02#) = "2016-05-02"',
      "If(False, #2015-05-02#, #2016-05-02#) = #2016-05-02#",
      "If(False, 2.34, #2016-05-02#) = Invalid Data Type error.",
    ],
  },
];

const MathFunctions: OutSystemsLangFunction[] = [
  {
    label: "Abs",
    description:
      "Returns the absolute value (unsigned magnitude) of the decimal number 'n'.",
    group: "Math",
    parameters: [
      {
        name: "n",
        type: "Decimal",
        description: "The number to extract the absolute value from.",
        mandatory: true,
      },
    ],
    examples: ["Abs(-10.89) = 10.89"],
    returnType: "Decimal",
    jsParser: ([n]) => `Math.abs(${n})`,
  },
  {
    label: "Mod",
    description: "Returns the remainder of decimal division of 'n' by 'm'.",
    group: "Math",
    parameters: [
      {
        name: "n",
        type: "Decimal",
        description: "The dividend in the modulo operation.",
        mandatory: true,
      },
      {
        name: "m",
        type: "Decimal",
        description: "The divisor in the modulo operation.",
        mandatory: true,
      },
    ],
    examples: ["Mod(10, 3) = 1", "Mod(4, 3.5) = 0.5"],
    returnType: "Decimal",
    jsParser: ([n, m]) => `(${n} % ${m})`,
  },
  {
    label: "Power",
    description: "Returns 'n' raised to the power of 'm'.",
    group: "Math",
    parameters: [
      {
        name: "n",
        type: "Decimal",
        description: "The base value.",
        mandatory: true,
      },
      {
        name: "m",
        type: "Decimal",
        description: "The exponent value.",
        mandatory: true,
      },
    ],
    examples: [
      "Power(100, 2) = 10000",
      "Power(-10.89, 2.3)",
      "Power(-10.89, -5) = -6.52920946044017E-06",
    ],
    returnType: "Decimal",
    jsParser: ([n, m]) => `Math.pow(${n}, ${m})`,
  },
  {
    label: "Round",
    description: [
      "Returns the Decimal number 'n' rounded to a specific number of 'fractional digits'.",
      "The round method applied depends on where the function is used:",
      "- In expressions in client-side and server-side logic, applies the method round half to even (rounds to the nearest integer, 0.5 rounds to the nearest even integer).",
      "- In aggregates that query SQL Server or Oracle databases, applies the method round half away from 0 (rounds to the nearest integer, 0.5 rounds the number further away from 0).",
      "- In aggregates that query MySQL or iDB2 databases, applies the method round half up (rounds to the nearest integer, 0.5 rounds up).",
    ],
    group: "Math",
    parameters: [
      {
        name: "n",
        type: "Decimal",
        description: "The Decimal number to round",
        mandatory: true,
      },
      {
        name: "fractionalDigits",
        type: "Integer",
        description:
          "Use it to specify the number of fractional digits that n has to be rounded to. The default value is 0. Note: In aggregates this parameter is not specified.",
        mandatory: true,
      },
    ],
    examples: [
      "Round(-10.89) = -11",
      "Round(-5.5) = -6",
      "Round(9.3) = 9",
      "Round(2.5) = 2",
      "Round(3.5) = 4",
      "Round(9.123456789, 5) = 9.12346",
    ],
    returnType: "Decimal",
    jsParser: ([n, fractionalDigits]) =>
      `__osRoundHalfEven(${n}, ${fractionalDigits})`,
    javascriptDependency: NumberRuntime,
  },
  {
    group: "Math",
    description: "Returns the square root of the Decimal number 'n'.",
    label: "Sqrt",
    parameters: [
      {
        name: "n",
        type: "Decimal",
        description: "The number to calculate the square root from.",
        mandatory: true,
      },
    ],
    examples: ["Sqrt(2.3) = 1.51657508881031"],
    returnType: "Decimal",
    jsParser: ([n]) => `Math.sqrt(${n})`,
  },
  {
    label: "Trunc",
    description:
      "Returns the Decimal number 'n' truncated to integer removing the decimal part of 'n'.",
    group: "Math",
    parameters: [
      {
        name: "n",
        type: "Decimal",
        description: "The number to truncate.",
        mandatory: true,
      },
    ],
    examples: ["Trunc(-10.89) = -10", "Trunc(7.51) = 7"],
    returnType: "Decimal",
    jsParser: ([n]) => `Math.trunc(${n})`,
  },
];

const NumericFunctions: OutSystemsLangFunction[] = [
  {
    label: "Max",
    description: "Returns the largest number of 'n' and 'm'.",
    group: "Numeric",
    parameters: [
      {
        name: "n",
        type: "Decimal",
        description: "The first number to compare.",
        mandatory: true,
      },
      {
        name: "m",
        type: "Decimal",
        description: "The second number to compare.",
        mandatory: true,
      },
    ],
    examples: ["Max(-10.89, -2.3) = -2.3", "Max(10.89, 2.3) = 10.89"],
    returnType: "Decimal",
    jsParser: ([n, m]) => `Math.max(${n}, ${m})`,
  },
  {
    label: "Min",
    description: "Returns the smallest number of 'n' and 'm'.",
    group: "Numeric",
    parameters: [
      {
        name: "n",
        type: "Decimal",
        description: "The first number to compare.",
        mandatory: true,
      },
      {
        name: "m",
        type: "Decimal",
        description: "The second number to compare.",
        mandatory: true,
      },
    ],
    examples: ["Min(-10.89, -2.3) = -10.89", "Min(10.89, 2.3) = 2.3"],
    returnType: "Decimal",
    jsParser: ([n, m]) => `Math.min(${n}, ${m})`,
  },
  {
    label: "Sign",
    description:
      "Returns -1 if 'n' is negative; 1 if 'n' is positive; 0 if 'n' is 0.",
    group: "Numeric",
    parameters: [
      {
        name: "n",
        type: "Decimal",
        description: "The number from which to calculate the sign value.",
        mandatory: true,
      },
    ],
    examples: ["Sign(-10.89) = -1", "Sign(2.3) = 1", "Sign(0.0) = 0"],
    returnType: "Integer",
    jsParser: ([n]) => `Math.sign(${n})`,
  },
];

const TextFunctions: OutSystemsLangFunction[] = [
  {
    label: "Chr",
    description:
      "Returns a single-character string corresponding to the 'c' character code.",
    group: "Text",
    parameters: [
      {
        name: "c",
        type: "Integer",
        description: "The ASCII code value to be converted to a character.",
        mandatory: true,
      },
    ],
    examples: ['Chr(88) = "X"'],
    returnType: "Text",
    jsParser: ([c]) => `String.fromCharCode(${c})`,
  },
  {
    label: "Concat",
    description: "Returns the concatenation of two Texts: 't1' and 't2'.",
    group: "Text",
    parameters: [
      {
        name: "t1",
        type: "Text",
        description: "The first string.",
        mandatory: true,
      },
      {
        name: "t2",
        type: "Text",
        description:
          "The string that will be appended to the first string in the output.",
        mandatory: true,
      },
    ],
    examples: [
      'Concat("First string", "last string") = "First stringlast string"',
      'Concat("", "") = ""',
    ],
    returnType: "Text",
    jsParser: ([t1, t2]) => `(__osText(${t1}) + __osText(${t2}))`,
    javascriptDependency: TextRuntime,
  },
  {
    label: "EncodeHtml",
    description: [
      "Replaces special characters in a string so that you can use it in HTML literals. Use this function when using unescaped expressions that contain content provided by end-users.",
      "",
      "Warning: Since this function only encodes strings that will be used in HTML literals, it does not protect you from cross-site scripting (XSS) or JavaScript injection vulnerabilities on its own. Do not use this function to encode text that might get executed as JavaScript code, only to encode HTML literals.",
    ].join(NewLine),
    group: "Text",
    parameters: [
      {
        name: "text",
        type: "Text",
        description: "The Text to be encoded.",
        mandatory: true,
      },
    ],
    examples: [
      'EncodeHtml("<>") = "&lt;&gt;"',
      'EncodeHtml("another \' test") = "another &#39; test"',
      'EncodeHtml("another "" test") = "another &quot; test"',
      'EncodeHtml("Hello" + NewLine() + "World!") = "Hello<br/>World!"',
    ],
    returnType: "Text",
    jsParser: ([text]) => `__osEncodeHtml(${text})`,
    javascriptDependency: EncodeHtmlRuntime,
  },
  {
    label: "EncodeJavaScript",
    description: [
      "Replaces special characters in a string so that you can use it in JavaScript literals. Use this function when using unescaped expressions that contain content provided by end-users.",
      "",
      "Warning: Since this function only encodes strings that will be used in JavaScript literals, it does not protect you from cross-site scripting (XSS) or JavaScript injection vulnerabilities on its own. Do not use this function to encode text that might get executed as JavaScript code, only to encode JavaScript literals.",
    ].join(NewLine),
    group: "Text",
    parameters: [
      {
        name: "text",
        type: "Text",
        description: "The Text to be encoded.",
        mandatory: true,
      },
    ],
    examples: [
      'EncodeJavaScript("another \' test") = "another \\x27 test"',
      'EncodeJavaScript("<>") = "\\x3c\\x3e"',
    ],
    returnType: "Text",
    jsParser: ([text]) => `__osEncodeJavaScript(${text})`,
    javascriptDependency: EncodeJavaScriptRuntime,
  },
  {
    label: "EncodeSql",
    description: [
      "Replaces special characters in a string so that you can use it in SQL literals, by doubling the single quotes.",
      "Use this function when using unescaped expressions in SQL queries that contain content provided by end-users.",
    ],
    group: "Text",
    parameters: [
      {
        name: "text",
        type: "Text",
        description: "The Text to be encoded.",
        mandatory: true,
      },
    ],
    examples: [
      "EncodeSql(\"another ' test\") = \"another '' test\"",
    ],
    returnType: "Text",
    jsParser: ([text]) => `String(${text}).split("'").join("''")`,
  },
  {
    label: "EncodeURL",
    description:
      "Replaces all non-alphanumeric characters in a string, i.e. characters outside of the [0-9a-zA-Z] range, so that you can safely use it in URL parameter values. Use this function to build URLs in your application that may contain content provided by end-users, e.g. when dynamically building URLs to an external site.",
    group: "Text",
    parameters: [
      {
        name: "text",
        type: "Text",
        description: "The Text to be encoded.",
        mandatory: true,
      },
    ],
    examples: [
      'EncodeUrl(" test") = "+test"',
      'EncodeUrl("another \' test") = "another+%27+test"',
      'EncodeUrl("<>") = "%3c%3e"',
      'EncodeUrl("1+2") = "1%2b2"',
      'EncodeUrl("Company A&A") = "Company+A%26A"',
    ],
    returnType: "Text",
    jsParser: ([text]) => `__osEncodeUrl(${text})`,
    javascriptDependency: EncodeUrlRuntime,
  },
  {
    label: "Index",
    description:
      "Returns the zero-based position in Text 't' where 'search' Text can be found. Returns -1 if 'search' is not found or if 'search' is empty.",
    group: "Text",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text where the search Text can be found.",
        mandatory: true,
      },
      {
        name: "search",
        type: "Text",
        description: "The Text string to be found.",
        mandatory: true,
      },
      {
        name: "startIndex",
        type: "Integer",
        description:
          "Indicates the (zero-based) index where the search starts. In case of searching from the end to the start, a startIndex different from 0 (zero) indicates the end of the text. The default value is 0 (zero). When used in Aggregates this parameter is not present.",
      },
      {
        name: "searchFromEnd",
        type: "Boolean",
        description:
          "Indicates the direction of the search. In case of searching from the end to the start, a startIndex different from 0 (zero) indicates the end of the text. The default value is False. When used in Aggregates this parameter is not present.",
      },
      {
        name: "ignoreCase",
        type: "Boolean",
        description:
          "Set True to treat lowercase and uppercase characters as equal, ignoring the casing of the Text inputs 't' and 'search'. The default value is False. When used in Aggregates this parameter is not present.",
      },
    ],
    examples: [
      'Index("First string", "F")',
      'Index("First string", "st") = 3',
      'Index("First string", "xx") = -1',
      'Index("First string", "F", startIndex: 5) = -1',
      'Index("First string", "st", startIndex: 5) = 6',
      'Index("First string", "xx", startIndex: 5) = -1',
      'Index("First string", "F", searchFromEnd: True)',
      'Index("First string", "st", searchFromEnd: True) = 6',
      'Index("First string", "xx", searchFromEnd: True) = -1',
      'Index("First string", "f") = -1',
      'Index("First string", "f", ignoreCase: True)',
      'Index("", "xx") = -1',
      'Index("First string", "") = -1',
      'Index("", "") = -1',
    ],
    returnType: "Integer",
    // Omitted optional arguments arrive as "", which is not valid inside a JS call
    jsParser: (args) => `((t, search, startIndex = 0, searchFromEnd = false, ignoreCase = false) => {
      if (search === "") return -1;
      if (ignoreCase) {
        t = t.toLowerCase();
        search = search.toLowerCase();
      }
      // When searching from the end, a startIndex other than 0 marks the end of the text
      if (searchFromEnd)
        return (startIndex !== 0 ? t.slice(0, startIndex) : t).lastIndexOf(search);
      return t.indexOf(search, startIndex);
    })(${args.map((arg) => arg || "undefined").join(", ")})`,
  },
  {
    label: "Length",
    description: "Returns the number of characters in Text 't'.",
    group: "Text",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to calculate the length of.",
        mandatory: true,
      },
    ],
    examples: ['Length("First string") = 12', 'Length("") = 0'],
    returnType: "Integer",
    jsParser: ([t]) => `${t}.length`,
  },
  {
    label: "NewLine",
    description: "Returns a string containing the New Line (Return) character.",
    group: "Text",
    parameters: [],
    examples: [],
    returnType: "Text",
    jsParser: () => '"\\r\\n"',
  },
  {
    label: "Replace",
    description: [
      "Returns the Text 't' after replacing all the occurrences of 'search' with 'replace'.",
      "The search is case-sensitive. When 'search' is empty, 't' is returned unchanged.",
    ],
    group: "Text",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text where the replacements are made.",
        mandatory: true,
      },
      {
        name: "search",
        type: "Text",
        description: "The Text to be replaced.",
        mandatory: true,
      },
      {
        name: "replace",
        type: "Text",
        description: "The Text that replaces each occurrence of search.",
        mandatory: true,
      },
    ],
    examples: [
      'Replace("First string", "st", "ST") = "FirST STring"',
      'Replace("First string", "xx", "ST") = "First string"',
    ],
    returnType: "Text",
    jsParser: ([t, search, replace]) =>
      `((t, search, replace) => (search === "" ? t : t.split(search).join(replace)))(${t}, ${search}, ${replace})`,
  },
  {
    label: "Substr",
    description: [
      "Returns the substring of 't' with 'length' characters, starting at the zero-based position 'start'.",
      "Returns an empty Text when 'start' is outside of 't' or 'length' isn't positive. The result is shorter when 't' ends before 'length' characters.",
    ],
    group: "Text",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to extract the substring from.",
        mandatory: true,
      },
      {
        name: "start",
        type: "Integer",
        description: "The zero-based position where the substring starts.",
        mandatory: true,
      },
      {
        name: "length",
        type: "Integer",
        description: "The number of characters to extract.",
        mandatory: true,
      },
    ],
    examples: [
      'Substr("First string", 0, 5) = "First"',
      'Substr("First string", 6, 100) = "string"',
      'Substr("First string", 20, 5) = ""',
    ],
    returnType: "Text",
    jsParser: ([t, start, length]) =>
      `((t, start, length) => (start < 0 || length <= 0 ? "" : t.slice(start, start + length)))(${t}, ${start}, ${length})`,
  },
  {
    label: "ToLower",
    description: "Converts all characters of 't' to lowercase.",
    group: "Text",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'ToLower("First String") = "first string"',
    ],
    returnType: "Text",
    jsParser: ([t]) => `String(${t}).toLowerCase()`,
  },
  {
    label: "ToUpper",
    description: "Converts all characters of 't' to uppercase.",
    group: "Text",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'ToUpper("First String") = "FIRST STRING"',
    ],
    returnType: "Text",
    jsParser: ([t]) => `String(${t}).toUpperCase()`,
  },
  {
    label: "Trim",
    description: "Removes the white spaces at the start and at the end of 't'.",
    group: "Text",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to trim.",
        mandatory: true,
      },
    ],
    examples: [
      'Trim("  First string  ") = "First string"',
    ],
    returnType: "Text",
    jsParser: ([t]) => `String(${t}).trim()`,
  },
  {
    label: "TrimEnd",
    description: "Removes the white spaces at the end of 't'.",
    group: "Text",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to trim.",
        mandatory: true,
      },
    ],
    examples: [
      'TrimEnd("  First string  ") = "  First string"',
    ],
    returnType: "Text",
    jsParser: ([t]) => `String(${t}).trimEnd()`,
  },
  {
    label: "TrimStart",
    description: "Removes the white spaces at the start of 't'.",
    group: "Text",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to trim.",
        mandatory: true,
      },
    ],
    examples: [
      'TrimStart("  First string  ") = "First string  "',
    ],
    returnType: "Text",
    jsParser: ([t]) => `String(${t}).trimStart()`,
  },
];

const DateAndTimeFunctions: OutSystemsLangFunction[] = [
  {
    label: "AddDays",
    description: "Adds 'n' days to 'dt'. Use a negative 'n' to subtract days.",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to add the days to.",
        mandatory: true,
      },
      {
        name: "n",
        type: "Integer",
        description: "The number of days to add.",
        mandatory: true,
      },
    ],
    examples: [
      "AddDays(#2016-01-31#, 1) = #2016-02-01 00:00:00#",
      "AddDays(#2016-03-01 10:00:00#, -1) = #2016-02-29 10:00:00#",
    ],
    returnType: "DateTime",
    jsParser: ([dt, n]) => `__osDate((${dt}).getTime() + (${n}) * 86400000, "DateTime")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "AddHours",
    description: "Adds 'n' hours to 'dt'. Use a negative 'n' to subtract hours.",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to add the hours to.",
        mandatory: true,
      },
      {
        name: "n",
        type: "Integer",
        description: "The number of hours to add.",
        mandatory: true,
      },
    ],
    examples: [
      "AddHours(#2016-01-01 23:00:00#, 2) = #2016-01-02 01:00:00#",
    ],
    returnType: "DateTime",
    jsParser: ([dt, n]) => `__osDate((${dt}).getTime() + (${n}) * 3600000, "DateTime")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "AddMinutes",
    description: "Adds 'n' minutes to 'dt'. Use a negative 'n' to subtract minutes.",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to add the minutes to.",
        mandatory: true,
      },
      {
        name: "n",
        type: "Integer",
        description: "The number of minutes to add.",
        mandatory: true,
      },
    ],
    examples: [
      "AddMinutes(#2016-01-01 10:50:00#, 15) = #2016-01-01 11:05:00#",
    ],
    returnType: "DateTime",
    jsParser: ([dt, n]) => `__osDate((${dt}).getTime() + (${n}) * 60000, "DateTime")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "AddMonths",
    description: [
      "Adds 'n' months to 'dt'. Use a negative 'n' to subtract months.",
      "When the resulting month has fewer days than the day of 'dt', the result is the last day of that month.",
    ],
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to add the months to.",
        mandatory: true,
      },
      {
        name: "n",
        type: "Integer",
        description: "The number of months to add.",
        mandatory: true,
      },
    ],
    examples: [
      "AddMonths(#2016-01-31#, 1) = #2016-02-29 00:00:00#",
      "AddMonths(#2016-03-15 10:00:00#, -3) = #2015-12-15 10:00:00#",
    ],
    returnType: "DateTime",
    jsParser: ([dt, n]) => `__osAddMonths(${dt}, ${n})`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "AddSeconds",
    description: "Adds 'n' seconds to 'dt'. Use a negative 'n' to subtract seconds.",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to add the seconds to.",
        mandatory: true,
      },
      {
        name: "n",
        type: "Integer",
        description: "The number of seconds to add.",
        mandatory: true,
      },
    ],
    examples: [
      "AddSeconds(#2016-01-01 10:00:50#, 15) = #2016-01-01 10:01:05#",
    ],
    returnType: "DateTime",
    jsParser: ([dt, n]) => `__osDate((${dt}).getTime() + (${n}) * 1000, "DateTime")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "AddYears",
    description: [
      "Adds 'n' years to 'dt'. Use a negative 'n' to subtract years.",
      "When 'dt' is February 29 and the resulting year is not a leap year, the result is February 28.",
    ],
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to add the years to.",
        mandatory: true,
      },
      {
        name: "n",
        type: "Integer",
        description: "The number of years to add.",
        mandatory: true,
      },
    ],
    examples: [
      "AddYears(#2016-02-29#, 1) = #2017-02-28 00:00:00#",
      "AddYears(#2016-05-21 22:20:30#, -1) = #2015-05-21 22:20:30#",
    ],
    returnType: "DateTime",
    jsParser: ([dt, n]) => `__osAddMonths(${dt}, (${n}) * 12)`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "BuildDateTime",
    description: "Creates a new Date Time from the date of 'd' and the time of 't'.",
    group: "Date and Time",
    parameters: [
      {
        name: "d",
        type: "Date",
        description: "The Date to use.",
        mandatory: true,
      },
      {
        name: "t",
        type: "Time",
        description: "The Time to use.",
        mandatory: true,
      },
    ],
    examples: [
      "BuildDateTime(#2016-05-21#, #22:20:30#) = #2016-05-21 22:20:30#",
    ],
    returnType: "DateTime",
    jsParser: ([d, t]) => `((d, t) => __osDate(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds()), "DateTime"))(${d}, ${t})`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "CurrDate",
    description: [
      "In client-side calls, it returns the device date.",
      "In server-side calls, it returns the platform server date.",
      "In query calls, it returns the platform server date. ",
    ],
    group: "Date and Time",
    parameters: [],
    examples: [],
    returnType: "Date",
    jsParser: () =>
      `__osDate("${deviceDateTime(new Date()).split("T")[0]}T00:00:00Z", "Date")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "CurrDateTime",
    description: [
      "In client-side calls, it returns the device date and time. It also returns milliseconds.",
      "In server-side calls, it returns the platform server date and time.",
      "In query calls, it returns the platform server date and time.",

      "Date times in the device are converted in the server to the server time zone.",
      "Conversely, date times in the server are converted in the device to the device time zone. ",
    ],
    group: "Date and Time",
    parameters: [],
    examples: [],
    returnType: "DateTime",
    jsParser: () =>
      `__osDate("${deviceDateTime(new Date())}", "DateTime")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "CurrTime",
    description: [
      "In client-side calls, it returns the device time.",
      "In server-side calls, it returns the platform server time.",
      "In query calls, it returns the platform server time.",
    ],
    group: "Date and Time",
    parameters: [
    ],
    examples: [
    ],
    returnType: "Time",
    jsParser: () =>
      `__osDate("1900-01-01T${deviceDateTime(new Date()).split("T")[1]}", "Time")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "Day",
    description: "Returns the day of 'dt'.",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to extract the day from.",
        mandatory: true,
      },
    ],
    examples: [
      "Day(#2016-05-21#) = 21",
    ],
    returnType: "Integer",
    jsParser: ([dt]) => `((${dt}).getUTCDate())`,
  },
  {
    label: "DayOfWeek",
    description: "Returns the day of the week of 'dt', from 0 (Sunday) to 6 (Saturday).",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to extract the day of the week from.",
        mandatory: true,
      },
    ],
    examples: [
      "DayOfWeek(#2016-05-21#) = 6",
      "DayOfWeek(#2016-05-22#) = 0",
    ],
    returnType: "Integer",
    jsParser: ([dt]) => `(${dt}).getUTCDay()`,
  },
  {
    label: "DiffDays",
    description: [
      "Returns the number of days between 'dt1' and 'dt2'.",
      "Only the date is considered, so the time of day is ignored. The result is negative when 'dt2' is before 'dt1'.",
    ],
    group: "Date and Time",
    parameters: [
      {
        name: "dt1",
        type: "DateTime",
        description: "The start Date Time.",
        mandatory: true,
      },
      {
        name: "dt2",
        type: "DateTime",
        description: "The end Date Time.",
        mandatory: true,
      },
    ],
    examples: [
      "DiffDays(#2016-01-01#, #2016-01-31#) = 30",
      "DiffDays(#2016-01-01 23:00:00#, #2016-01-02 01:00:00#) = 1",
      "DiffDays(#2016-01-31#, #2016-01-01#) = -30",
    ],
    returnType: "Integer",
    jsParser: ([dt1, dt2]) =>
      `(Math.floor((${dt2}).getTime() / 86400000) - Math.floor((${dt1}).getTime() / 86400000))`,
  },
  {
    label: "DiffHours",
    description: [
      "Returns the number of whole hours between 'dt1' and 'dt2'.",
      "The result is negative when 'dt2' is before 'dt1'.",
    ],
    group: "Date and Time",
    parameters: [
      {
        name: "dt1",
        type: "DateTime",
        description: "The start Date Time.",
        mandatory: true,
      },
      {
        name: "dt2",
        type: "DateTime",
        description: "The end Date Time.",
        mandatory: true,
      },
    ],
    examples: [
      "DiffHours(#2016-01-01 10:00:00#, #2016-01-01 12:30:00#) = 2",
    ],
    returnType: "Integer",
    jsParser: ([dt1, dt2]) =>
      `Math.trunc(((${dt2}).getTime() - (${dt1}).getTime()) / 3600000)`,
  },
  {
    label: "DiffMinutes",
    description: [
      "Returns the number of whole minutes between 'dt1' and 'dt2'.",
      "The result is negative when 'dt2' is before 'dt1'.",
    ],
    group: "Date and Time",
    parameters: [
      {
        name: "dt1",
        type: "DateTime",
        description: "The start Date Time.",
        mandatory: true,
      },
      {
        name: "dt2",
        type: "DateTime",
        description: "The end Date Time.",
        mandatory: true,
      },
    ],
    examples: [
      "DiffMinutes(#2016-01-01 10:00:00#, #2016-01-01 10:30:59#) = 30",
    ],
    returnType: "Integer",
    jsParser: ([dt1, dt2]) =>
      `Math.trunc(((${dt2}).getTime() - (${dt1}).getTime()) / 60000)`,
  },
  {
    label: "DiffSeconds",
    description: [
      "Returns the number of whole seconds between 'dt1' and 'dt2'.",
      "The result is negative when 'dt2' is before 'dt1'.",
    ],
    group: "Date and Time",
    parameters: [
      {
        name: "dt1",
        type: "DateTime",
        description: "The start Date Time.",
        mandatory: true,
      },
      {
        name: "dt2",
        type: "DateTime",
        description: "The end Date Time.",
        mandatory: true,
      },
    ],
    examples: [
      "DiffSeconds(#2016-01-01 10:00:00#, #2016-01-01 10:01:05#) = 65",
    ],
    returnType: "Integer",
    jsParser: ([dt1, dt2]) =>
      `Math.trunc(((${dt2}).getTime() - (${dt1}).getTime()) / 1000)`,
  },
  {
    label: "Hour",
    description: "Returns the hours of 'dt'.",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to extract the hours from.",
        mandatory: true,
      },
    ],
    examples: [
      "Hour(#2016-05-21 22:20:30#) = 22",
    ],
    returnType: "Integer",
    jsParser: ([dt]) => `((${dt}).getUTCHours())`,
  },
  {
    label: "Minute",
    description: "Returns the minutes of 'dt'.",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to extract the minutes from.",
        mandatory: true,
      },
    ],
    examples: [
      "Minute(#2016-05-21 22:20:30#) = 20",
    ],
    returnType: "Integer",
    jsParser: ([dt]) => `((${dt}).getUTCMinutes())`,
  },
  {
    label: "Month",
    description: "Returns the month of 'dt'.",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to extract the month from.",
        mandatory: true,
      },
    ],
    examples: [
      "Month(#2016-05-21#) = 5",
    ],
    returnType: "Integer",
    jsParser: ([dt]) => `((${dt}).getUTCMonth() + 1)`,
  },
  {
    label: "NewDate",
    description: [
      "Creates a new Date from 'year', 'month' and 'day'.",
      "Returns #1900-01-01# (the null date) when the values don't form a valid date.",
    ],
    group: "Date and Time",
    parameters: [
      {
        name: "year",
        type: "Integer",
        description: "The year.",
        mandatory: true,
      },
      {
        name: "month",
        type: "Integer",
        description: "The month, from 1 to 12.",
        mandatory: true,
      },
      {
        name: "day",
        type: "Integer",
        description: "The day of the month.",
        mandatory: true,
      },
    ],
    examples: [
      "NewDate(2016, 5, 21) = #2016-05-21#",
      "NewDate(2016, 2, 30) = #1900-01-01#",
    ],
    returnType: "Date",
    jsParser: ([year, month, day]) =>
      `(__osBuildDate("Date", ${year}, ${month}, ${day}) ?? __osDate("1900-01-01T00:00:00Z", "Date"))`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "NewDateTime",
    description: [
      "Creates a new Date Time from the given date and time values.",
      "Returns #1900-01-01 00:00:00# (the null date) when the values don't form a valid Date Time.",
    ],
    group: "Date and Time",
    parameters: [
      {
        name: "year",
        type: "Integer",
        description: "The year.",
        mandatory: true,
      },
      {
        name: "month",
        type: "Integer",
        description: "The month, from 1 to 12.",
        mandatory: true,
      },
      {
        name: "day",
        type: "Integer",
        description: "The day of the month.",
        mandatory: true,
      },
      {
        name: "hour",
        type: "Integer",
        description: "The hour, from 0 to 23.",
        mandatory: true,
      },
      {
        name: "minute",
        type: "Integer",
        description: "The minute, from 0 to 59.",
        mandatory: true,
      },
      {
        name: "second",
        type: "Integer",
        description: "The second, from 0 to 59.",
        mandatory: true,
      },
    ],
    examples: [
      "NewDateTime(2016, 5, 21, 22, 20, 30) = #2016-05-21 22:20:30#",
      "NewDateTime(2016, 5, 21, 24, 0, 0) = #1900-01-01 00:00:00#",
    ],
    returnType: "DateTime",
    jsParser: ([year, month, day, hour, minute, second]) =>
      `(__osBuildDate("DateTime", ${year}, ${month}, ${day}, ${hour}, ${minute}, ${second}) ?? __osDate("1900-01-01T00:00:00Z", "DateTime"))`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "NewTime",
    description: [
      "Creates a new Time from 'hour', 'minute' and 'second'.",
      "Returns #00:00:00# when the values don't form a valid time.",
    ],
    group: "Date and Time",
    parameters: [
      {
        name: "hour",
        type: "Integer",
        description: "The hour, from 0 to 23.",
        mandatory: true,
      },
      {
        name: "minute",
        type: "Integer",
        description: "The minute, from 0 to 59.",
        mandatory: true,
      },
      {
        name: "second",
        type: "Integer",
        description: "The second, from 0 to 59.",
        mandatory: true,
      },
    ],
    examples: [
      "NewTime(22, 20, 30) = #22:20:30#",
      "NewTime(25, 0, 0) = #00:00:00#",
    ],
    returnType: "Time",
    jsParser: ([hour, minute, second]) =>
      `(__osBuildDate("Time", 1900, 1, 1, ${hour}, ${minute}, ${second}) ?? __osDate("1900-01-01T00:00:00Z", "Time"))`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "Second",
    description: "Returns the seconds of 'dt'.",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to extract the seconds from.",
        mandatory: true,
      },
    ],
    examples: ["Second(#2015-05-21 22:20:30#) = 30"],
    returnType: "Integer",
    jsParser: ([dt]) => `(${dt}).getUTCSeconds()`,
  },
  {
    label: "Year",
    description: "Returns the year of 'dt'.",
    group: "Date and Time",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to extract the year from.",
        mandatory: true,
      },
    ],
    examples: ["Year(#2015-07-14#) = 2015"],
    returnType: "Integer",
    jsParser: ([dt]) => `(${dt}).getUTCFullYear()`,
  },
];

const DataConversionFunctions: OutSystemsLangFunction[] = [
  {
    label: "BooleanToInteger",
    description: "Converts Boolean 'b' to an Integer value, either 1 if 'b' is True or 0 if 'b' is False.",
    group: "Data Conversion",
    parameters: [
      {
        name: "b",
        type: "Boolean",
        description: "The Boolean to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'BooleanToInteger(True) = 1',
      'BooleanToInteger(False) = 0',
    ],
    returnType: "Integer",
    jsParser: ([b]) =>
      `((b) => (b ? 1 : 0))(${b})`,
  },
  {
    label: "BooleanToText",
    description: "Converts Boolean 'b' to a Text value, either \"True\" or \"False\".",
    group: "Data Conversion",
    parameters: [
      {
        name: "b",
        type: "Boolean",
        description: "The Boolean to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'BooleanToText(True) = "True"',
      'BooleanToText(False) = "False"',
    ],
    returnType: "Text",
    jsParser: ([b]) => `__osText(Boolean(${b}))`,
    javascriptDependency: TextRuntime,
  },
  {
    label: "DateTimeToDate",
    description: "Converts Date Time 'dt' to a Date value dropping the Time component.",
    group: "Data Conversion",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'DateTimeToDate(#2013-11-30 22:20:30#) = #2013-11-30#',
    ],
    returnType: "Date",
    jsParser: ([dt]) => `__osDatePart(${dt})`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "DateTimeToText",
    description: "Converts Date Time 'dt' to a Text value in the format specified in the environment configuration (by default, \"yyyy-MM-dd HH:mm:ss\").",
    group: "Data Conversion",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'DateTimeToText(#2015-05-21 22:20:30#) = "2015-05-21 22:20:30"',
      'DateTimeToText(#2015-05-21#) = "2015-05-21 00:00:00"',
      'DateTimeToText(#22:20:30#) = "1900-01-01 22:20:30"',
    ],
    returnType: "Text",
    jsParser: ([dt]) => `__osDateText(${dt}, "DateTime")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "DateTimeToTime",
    description: "Converts Date Time 'dt' to a Time value dropping the Date component.",
    group: "Data Conversion",
    parameters: [
      {
        name: "dt",
        type: "DateTime",
        description: "The Date Time to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'DateTimeToTime(#1982-05-21 22:20:30#) = #22:20:30#',
    ],
    returnType: "Time",
    jsParser: ([dt]) => `__osTimePart(${dt})`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "DateToDateTime",
    description: "Converts Date 'd' to a Date Time value, adding the Time component (#00:00:00#).",
    group: "Data Conversion",
    parameters: [
      {
        name: "d",
        type: "Date",
        description: "The Date to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'DateToDateTime(#2001-09-14#) = #2001-09-14 00:00:00#',
    ],
    returnType: "DateTime",
    jsParser: ([d]) => `__osDatePart(${d}, "DateTime")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "DateToText",
    description: "Converts Date 'd' to a Text value in the format specified in the environment configuration (by default, \"yyyy-MM-dd\").",
    group: "Data Conversion",
    parameters: [
      {
        name: "d",
        type: "Date",
        description: "The Date to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'DateToText(#2010-05-17#) = "2010-05-17"',
      'DateToText(#2010-05-17 22:30:32#) = "2010-05-17"',
    ],
    returnType: "Text",
    jsParser: ([d]) => `__osDateText(${d}, "Date")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "DecimalToBoolean",
    description: "Converts Decimal 'd' to a Boolean value. Decimal value of 0.0 is False. Any other value is True.",
    group: "Data Conversion",
    parameters: [
      {
        name: "d",
        type: "Decimal",
        description: "The Decimal to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'DecimalToBoolean(0.0) = False',
      'DecimalToBoolean(0.05) = True',
    ],
    returnType: "Boolean",
    jsParser: ([d]) =>
      `((d) => d !== 0)(${d})`,
  },
  {
    label: "DecimalToInteger",
    description: [
      "Converts Decimal 'd' to an Integer value.",
      "In client-side and server-side logic, the function rounds the input using the round half to even method. In Aggregate expressions the function truncates to the integer part of the input.",
      "To check if the conversion is possible you can use the DecimalToIntegerValidate function.",
    ],
    group: "Data Conversion",
    parameters: [
      {
        name: "d",
        type: "Decimal",
        description: "The Decimal to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'DecimalToInteger(134.2) = 134',
      'DecimalToInteger(134.5) = 134',
      'DecimalToInteger(133.5) = 134',
      'DecimalToInteger(134.7) = 135',
      'DecimalToInteger(134) = 134',
      'DecimalToInteger(12345678999.9) = 0',
    ],
    returnType: "Integer",
    jsParser: ([d]) =>
      `((d) => {
        const rounded = __osRoundHalfEven(d);
        return __osFitsInteger(rounded, 32) ? rounded : 0;
      })(${d})`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "DecimalToIntegerValidate",
    description: "Returns true if Decimal 'd' can be converted to an Integer value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "d",
        type: "Decimal",
        description: "The Decimal to validate.",
        mandatory: true,
      },
    ],
    examples: [
      'DecimalToIntegerValidate(134.2) = True',
      'DecimalToIntegerValidate(134.5) = True',
      'DecimalToIntegerValidate(133.5) = True',
      'DecimalToIntegerValidate(134.7) = True',
      'DecimalToIntegerValidate(134) = True',
      'DecimalToIntegerValidate(12345678999.9) = False',
    ],
    returnType: "Boolean",
    jsParser: ([d]) => `__osFitsInteger(__osRoundHalfEven(${d}), 32)`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "DecimalToLongInteger",
    description: [
      "Converts Decimal 'd' to a Long Integer value.",
      "In client-side and server-side logic, the function rounds the input using the round half to even method. In Aggregate expressions the function truncates to the integer part of the input.",
      "To check if the conversion is possible you can use the DecimalToLongIntegerValidate function.",
    ],
    group: "Data Conversion",
    parameters: [
      {
        name: "d",
        type: "Decimal",
        description: "The Decimal to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'DecimalToLongInteger(134.2) = 134',
      'DecimalToLongInteger(134.5) = 134',
      'DecimalToLongInteger(133.5) = 134',
      'DecimalToLongInteger(134.7) = 135',
      'DecimalToLongInteger(134) = 134',
      'DecimalToLongInteger(157898999999988844444.2) = 0',
    ],
    returnType: "LongInteger",
    jsParser: ([d]) =>
      `((d) => {
        const rounded = __osRoundHalfEven(d);
        return __osFitsInteger(rounded, 64) ? rounded : 0;
      })(${d})`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "DecimalToLongIntegerValidate",
    description: "Returns true if Decimal 'd' can be converted to a Long Integer value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "d",
        type: "Decimal",
        description: "The Decimal to validate.",
        mandatory: true,
      },
    ],
    examples: [
      'DecimalToLongIntegerValidate(134.2) = True',
      'DecimalToLongIntegerValidate(134.5) = True',
      'DecimalToLongIntegerValidate(133.5) = True',
      'DecimalToLongIntegerValidate(134.7) = True',
      'DecimalToLongIntegerValidate(134) = True',
      'DecimalToLongIntegerValidate(157898999999988844444.2) = False',
    ],
    returnType: "Boolean",
    jsParser: ([d]) => `__osFitsInteger(__osRoundHalfEven(${d}), 64)`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "DecimalToText",
    description: "Converts Decimal 'd' to a Text value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "d",
        type: "Decimal",
        description: "The Decimal to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'DecimalToText(200.482) = "200.482"',
      'DecimalToText(200) = "200"',
    ],
    returnType: "Text",
    jsParser: ([d]) => `__osText(${d})`,
    javascriptDependency: TextRuntime,
  },
  {
    label: "IdentifierToInteger",
    description: "Converts Identifier 'Id' to an Integer value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "id",
        type: "Identifier",
        description: "The Identifier to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'IdentifierToInteger(IntegerToIdentifier(504)) = 504',
    ],
    returnType: "Integer",
    jsParser: ([id]) => `(${id})`,
  },
  {
    label: "IdentifierToLongInteger",
    description: "Converts Identifier 'Id' to a Long Integer value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "id",
        type: "LongIntegerIdentifier",
        description: "The Identifier to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'IdentifierToLongInteger(LongIntegerToIdentifier(30)) = 30',
    ],
    returnType: "LongInteger",
    jsParser: ([id]) => `(${id})`,
  },
  {
    label: "IdentifierToText",
    description: "Converts Identifier 'Id' to a Text value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "id",
        type: "TextIdentifier",
        description: "The Identifier to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'IdentifierToText(IntegerToIdentifier(30)) = "30"',
    ],
    returnType: "Text",
    jsParser: ([id]) => `__osText(${id})`,
    javascriptDependency: TextRuntime,
  },
  {
    label: "IntegerToBoolean",
    description: "Converts Integer 'i' to a Boolean value. Boolean value of 0 is False. Any other value is True.",
    group: "Data Conversion",
    parameters: [
      {
        name: "i",
        type: "Integer",
        description: "The Integer to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'IntegerToBoolean(10) = True',
      'IntegerToBoolean(-10) = True',
      'IntegerToBoolean(0) = False',
    ],
    returnType: "Boolean",
    jsParser: ([i]) =>
      `((i) => i !== 0)(${i})`,
  },
  {
    label: "IntegerToDecimal",
    description: "Converts Integer 'i' to a Decimal value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "i",
        type: "Integer",
        description: "The Integer to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'IntegerToDecimal(200) = 200',
    ],
    returnType: "Decimal",
    jsParser: ([i]) => `(${i})`,
  },
  {
    label: "IntegerToIdentifier",
    description: "Converts Integer 'i' to an Integer Identifier.",
    group: "Data Conversion",
    parameters: [
      {
        name: "i",
        type: "Integer",
        description: "The Integer to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'IntegerToIdentifier(5) = 5',
    ],
    returnType: "Identifier",
    jsParser: ([i]) => `(${i})`,
  },
  {
    label: "IntegerToText",
    description: "Converts Integer 'i' to a Text value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "i",
        type: "Integer",
        description: "The Integer to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'IntegerToText(200) = "200"',
    ],
    returnType: "Text",
    jsParser: ([i]) => `__osText(${i})`,
    javascriptDependency: TextRuntime,
  },
  {
    label: "LongIntegerToIdentifier",
    description: "Converts Long Integer 'l' to a Long Integer Identifier.",
    group: "Data Conversion",
    parameters: [
      {
        name: "l",
        type: "LongInteger",
        description: "The Long Integer to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'LongIntegerToIdentifier(5090493034304) = 5090493034304',
    ],
    returnType: "LongIntegerIdentifier",
    jsParser: ([l]) => `(${l})`,
  },
  {
    label: "LongIntegerToInteger",
    description: [
      "Converts Long Integer 'l' to an Integer value. If 'l' is outside the boundaries of the Integer values, the function will return the Integer default value.",
      "To check if the conversion is possible you can use the LongIntegerToIntegerValidate function.",
    ],
    group: "Data Conversion",
    parameters: [
      {
        name: "l",
        type: "LongInteger",
        description: "The Long Integer to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'LongIntegerToInteger(3000) = 3000',
      'LongIntegerToInteger(5645245584135987412) = 0',
    ],
    returnType: "Integer",
    jsParser: ([l]) =>
      `((l) => (__osFitsInteger(l, 32) ? l : 0))(${l})`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "LongIntegerToIntegerValidate",
    description: "Returns true if Long Integer 'l' can be converted to an Integer value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "l",
        type: "LongInteger",
        description: "The Long Integer to validate.",
        mandatory: true,
      },
    ],
    examples: [
      'LongIntegerToIntegerValidate(3000) = True',
      'LongIntegerToIntegerValidate(5645245584135987412) = False',
    ],
    returnType: "Boolean",
    jsParser: ([l]) => `__osFitsInteger(${l}, 32)`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "LongIntegerToText",
    description: "Converts Long Integer 'l' to a Text value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "l",
        type: "LongInteger",
        description: "The Long Integer to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'LongIntegerToText(5092039102) = "5092039102"',
    ],
    returnType: "Text",
    jsParser: ([l]) => `__osText(${l})`,
    javascriptDependency: TextRuntime,
  },
  {
    label: "NullBinary",
    description: "Returns a null Binary Data value.",
    group: "Data Conversion",
    parameters: [
    ],
    examples: [
      'BinaryDataVariable = NullBinary()',
    ],
    returnType: "BinaryData",
    jsParser: () => "null",
  },
  {
    label: "NullDate",
    description: "Returns a null Date value.",
    group: "Data Conversion",
    parameters: [
    ],
    examples: [
      'NullDate() = #1900-01-01#',
    ],
    returnType: "Date",
    jsParser: () => `__osDate("1900-01-01T00:00:00Z", "Date")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "NullIdentifier",
    description: "Returns a null Identifier valid for Integer and Long Integer Identifiers.",
    group: "Data Conversion",
    parameters: [
    ],
    examples: [
      'NullIdentifier() = 0',
    ],
    returnType: "Identifier",
    jsParser: () => "0",
  },
  {
    label: "NullObject",
    description: "Returns a null Object value.",
    group: "Data Conversion",
    parameters: [
    ],
    examples: [
      'ObjectVariable = NullObject()',
    ],
    returnType: "Object",
    jsParser: () => "null",
  },
  {
    label: "NullTextIdentifier",
    description: "Returns a null Text Identifier.",
    group: "Data Conversion",
    parameters: [
    ],
    examples: [
      'NullTextIdentifier() = ""',
    ],
    returnType: "TextIdentifier",
    jsParser: () => '""',
  },
  {
    label: "TextToDate",
    description: [
      "Converts Text 't' to a Date value. If 't' can't be converted to a valid Date value, the function will return the Date default value.",
      "To check if the conversion is possible you can use the TextToDateValidate function.",
      "You should check the limits of the Date data type. You should also ensure that the date you type in the argument complies with the default date format (yyyy-mm-dd, yyyy/mm/dd, and yyyy.mm.dd) or the server's environment configuration.",
    ],
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToDate("2002-01-01") = #2002-01-01#',
      'TextToDate("2002/01/01") = #2002-01-01#',
      'TextToDate("2002.01.01") = #2002-01-01#',
      'TextToDate("2002-25-01") = #1900-01-01#',
      'TextToDate("2002/02/31") = #1900-01-01#',
      'TextToDate("10000.01.01") = #1900-01-01#',
    ],
    returnType: "Date",
    jsParser: ([t]) =>
      `(__osParseDateText(${t}, "Date") ?? __osDate("1900-01-01T00:00:00Z", "Date"))`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "TextToDateTime",
    description: [
      "Converts Text 't' to a Date Time value. If 't' can't be converted to a valid Date Time value, the function will return a Date Time default value.",
      "To check if the conversion is possible you can use the TextToDateTimeValidate function.",
      "You should check the limits of the Date Time data type. You should also ensure that the Date Time you type in the argument complies with the default Date Time format (yyyy-mm-dd hh:mm:ss, yyyy/mm/dd hh:mm:ss, and yyyy.mm.dd hh:mm:ss) or the server's environment configuration.",
    ],
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToDateTime("2002-01-01 01:01:01") = #2002-01-01 01:01:01#',
      'TextToDateTime("2002/01/01 01:01:01") = #2002-01-01 01:01:01#',
      'TextToDateTime("2002.01.01 01:01:01") = #2002-01-01 01:01:01#',
      'TextToDateTime("20-01-01 01:01:01") = #1900-01-01 00:00:00#',
      'TextToDateTime("date time") = #1900-01-01 00:00:00#',
      'TextToDateTime("2002.1.1 1-1-1") = #1900-01-01 00:00:00#',
      'TextToDateTime("2002-01-01") = #2002-01-01 00:00:00#',
      'TextToDateTime("01-01-01") = #1900-01-01 00:00:00#',
    ],
    returnType: "DateTime",
    jsParser: ([t]) =>
      `(__osParseDateText(${t}, "DateTime") ?? __osDate("1900-01-01T00:00:00Z", "DateTime"))`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "TextToDateTimeValidate",
    description: "Returns true if Text 't' can be converted to a Date Time value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to validate.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToDateTimeValidate("2002-01-01 01:01:01") = True',
      'TextToDateTimeValidate("2002/01/01 01:01:01") = True',
      'TextToDateTimeValidate("2002.01.01 01:01:01") = True',
      'TextToDateTimeValidate("20-01-01 01:01:01") = False',
      'TextToDateTimeValidate("date time") = False',
      'TextToDateTimeValidate("2002.1.1 1-1-1") = False',
      'TextToDateTimeValidate("2002-01-01") = True',
      'TextToDateTimeValidate("01-01-01") = False',
    ],
    returnType: "Boolean",
    jsParser: ([t]) => `(__osParseDateText(${t}, "DateTime") !== null)`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "TextToDateValidate",
    description: "Returns true if Text 't' can be converted to a Date value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to validate.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToDateValidate("2002-01-01") = True',
      'TextToDateValidate("2002/01/01") = True',
      'TextToDateValidate("2002.01.01") = True',
      'TextToDateValidate("2002-25-01") = False',
      'TextToDateValidate("2002/02/31") = False',
      'TextToDateValidate("10000.01.01") = False',
    ],
    returnType: "Boolean",
    jsParser: ([t]) => `(__osParseDateText(${t}, "Date") !== null)`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "TextToDecimal",
    description: [
      "Converts Text 't' to a Decimal value.",
      "The only allowed decimal separator is \".\" (period).",
      "If 't' is outside the boundaries of Decimal values, the function returns the Decimal default value. However, if you use TextToDecimal in an Aggregate and 't' is outside the boundaries of Decimal values, the function throws an exception.",
      "To check if the conversion is possible, use the TextToDecimalValidate function.",
    ],
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToDecimal("200") = 200',
      'TextToDecimal("-200") = -200',
      'TextToDecimal("200.482") = 200.482',
      'TextToDecimal("-200.482") = -200.482',
      'TextToDecimal("0.99999999") = 0.99999999',
      'TextToDecimal("abc") = 0',
    ],
    returnType: "Decimal",
    jsParser: ([t]) => `(__osParseDecimalText(${t}) ?? 0)`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "TextToDecimalValidate",
    description: "Returns true if Text 't' can be converted to a Decimal value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to validate.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToDecimalValidate("200") = True',
      'TextToDecimalValidate("-200") = True',
      'TextToDecimalValidate("200.482") = True',
      'TextToDecimalValidate("-200.482") = True',
      'TextToDecimalValidate("0.99999999") = True',
      'TextToDecimalValidate("abc") = False',
    ],
    returnType: "Boolean",
    jsParser: ([t]) => `(__osParseDecimalText(${t}) !== null)`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "TextToIdentifier",
    description: "Converts Text 't' to a Text Identifier.",
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToIdentifier("NEW") = "NEW"',
    ],
    returnType: "TextIdentifier",
    jsParser: ([t]) => `__osText(${t})`,
    javascriptDependency: TextRuntime,
  },
  {
    label: "TextToInteger",
    description: [
      "Converts Text 't' to an Integer value.",
      "If 't' is outside the boundaries of Integer values, the function returns the Integer default value. However, if you use TextToInteger in an Aggregate and 't' is outside the boundaries of Integer values, the function throws an exception.",
      "To check if the conversion is possible, use the TextToIntegerValidate function.",
    ],
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToInteger("200") = 200',
      'TextToInteger("-200") = -200',
      'TextToInteger("200.482") = 0',
      'TextToInteger("not a number") = 0',
    ],
    returnType: "Integer",
    jsParser: ([t]) => `(__osParseIntegerText(${t}, 32) ?? 0)`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "TextToIntegerValidate",
    description: "Returns true if Text 't' can be converted to an Integer value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to validate.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToIntegerValidate("200") = True',
      'TextToIntegerValidate("-200") = True',
      'TextToIntegerValidate("200.482") = False',
      'TextToIntegerValidate("not a number") = False',
    ],
    returnType: "Boolean",
    jsParser: ([t]) => `(__osParseIntegerText(${t}, 32) !== null)`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "TextToLongInteger",
    description: [
      "Converts Text 't' to a Long Integer value.",
      "If 't' is outside the boundaries of Long Integer values, the function returns the Long Integer default value. However, if you use TextToLongInteger in an Aggregate and 't' is outside the boundaries of Long Integer values, the function throws an exception.",
      "To check if the conversion is possible, use the TextToLongIntegerValidate function.",
    ],
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToLongInteger("200") = 200',
      'TextToLongInteger("-200") = -200',
      'TextToLongInteger("56452455841359874121") = 0',
      'TextToLongInteger("not a number") = 0',
    ],
    returnType: "LongInteger",
    jsParser: ([t]) => `(__osParseIntegerText(${t}, 64) ?? 0)`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "TextToLongIntegerValidate",
    description: "Returns true if Text 't' can be converted to a Long Integer value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to validate.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToLongIntegerValidate("200") = True',
      'TextToLongIntegerValidate("-200") = True',
      'TextToLongIntegerValidate("56452455841359874121") = False',
      'TextToLongIntegerValidate("not a number") = False',
    ],
    returnType: "Boolean",
    jsParser: ([t]) => `(__osParseIntegerText(${t}, 64) !== null)`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "TextToTime",
    description: [
      "Converts Text 't' to a Time value. If 't' can't be converted to a valid Time value, the function will return the Time default value.",
      "To check if the conversion is possible you can use the TextToTimeValidate function.",
      "You should check the limits of the Time data type. You should also ensure that the Time you type in the argument complies with the Time format (hh:mm:ss).",
    ],
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToTime("12:12:12") = #12:12:12#',
      'TextToTime("23:68:12") = #00:00:00#',
      'TextToTime("0-0-0") = #00:00:00#',
      'TextToTime("abc") = #00:00:00#',
    ],
    returnType: "Time",
    jsParser: ([t]) =>
      `(__osParseDateText(${t}, "Time") ?? __osDate("1900-01-01T00:00:00Z", "Time"))`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "TextToTimeValidate",
    description: "Returns true if Text 't' can be converted to a Time value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Text",
        description: "The Text to validate.",
        mandatory: true,
      },
    ],
    examples: [
      'TextToTimeValidate("12:12:12") = True',
      'TextToTimeValidate("23:68:12") = False',
      'TextToTimeValidate("0-0-0") = False',
      'TextToTimeValidate("abc") = False',
    ],
    returnType: "Boolean",
    jsParser: ([t]) => `(__osParseDateText(${t}, "Time") !== null)`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "TimeToText",
    description: "Converts Time 't' to a Text value in the format \"HH:mm:ss\".",
    group: "Data Conversion",
    parameters: [
      {
        name: "t",
        type: "Time",
        description: "The Time to convert.",
        mandatory: true,
      },
    ],
    examples: [
      'TimeToText(#12:30:24#) = "12:30:24"',
      'TimeToText(#2015-07-02 12:30:34#) = "12:30:34"',
    ],
    returnType: "Text",
    jsParser: ([t]) => `__osDateText(${t}, "Time")`,
    javascriptDependency: DateRuntime,
  },
  {
    label: "ToObject",
    description: "Converts expression 'exp' to an Object value.",
    group: "Data Conversion",
    parameters: [
      {
        name: "exp",
        type: "GenericType",
        description: "The expression to convert.",
        mandatory: true,
      },
    ],
    examples: [
    ],
    returnType: "Object",
    jsParser: ([exp]) => `(${exp})`,
  },
];

const FormatFunctions: OutSystemsLangFunction[] = [
  {
    label: "FormatCurrency",
    description: [
      "Builds a Text output of the specified Currency 'value', preceded by the currency 'symbol', using 'decimal_digits' after the decimal point. The decimal point is specified using 'decimal_separator', while the thousands can be separated with the 'group_separator'.",
      "",
      "When rounding, the function behaves differently depending on where you use it:",
      "",
      "- In the application server, it applies the method round half up (rounds to the nearest integer, 0.5 rounds up).",
      "- In client-side logic, it applies the method round half to even (rounds to the nearest integer, 0.5 rounds to the nearest even integer).",
    ],
    group: "Format",
    parameters: [
      {
        name: "value",
        type: "Decimal",
        description: "The Decimal value to be formatted.",
        mandatory: true,
      },
      {
        name: "symbol",
        type: "Text",
        description: "The currency symbol.",
        mandatory: true,
      },
      {
        name: "decimal_digits",
        type: "Integer",
        description: "The number of decimal digits.",
        mandatory: true,
      },
      {
        name: "decimal_separator",
        type: "Text",
        description: "The decimal separator symbol.",
        mandatory: true,
        defaultValue: '"."',
      },
      {
        name: "group_separator",
        type: "Text",
        description: " The group separator symbol.",
        mandatory: true,
        defaultValue: '","',
      },
    ],
    examples: [
      'FormatCurrency(1.2, "$", 1, "#", ".") = "$1#2"',
      'FormatCurrency(1.2, "$", 3, ",", ".") = "$1,200"',
      'FormatCurrency(1.24, "$", 1, ",", ".") = "$1,2"',
      'FormatCurrency(1.25, "$", 1, ",", ".") = "$1,3" (in the application server) or "$1,2" (in client-side logic)',
      'FormatCurrency(1.251, "$", 1, ",", ".") = "$1,3"',
      'FormatCurrency(1.35, "$", 1, ",", ".") = "$1,4"',
      'FormatCurrency(12345.67, "$", 2, ",", ".") = "$12.345,67"',
      'FormatCurrency(-12345.67, "$", 2, ",", ".") = "$-12.345,67"',
    ],
    returnType: "Text",
    jsParser: ([value, symbol, decimal_digits, decimal_separator, group_separator]) =>
      `(${symbol} + __osFormatNumber(${value}, ${decimal_digits}, ${decimal_separator}, ${group_separator}))`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "FormatDateTime",
    description: [
      "Builds a Text output of the specified Date Time 'value' using the specified 'format'. Formatting pattern can be any combination of the following:",
      "Day:",
      "- d: day without leading zero;",
      "- dd: day WITH leading zero;",
      "- ddd: abbreviated day name;",
      "- dddd: full day name;",
      "Month:",
      "- M: month without leading zero;",
      "- MM: month WITH leading zero;",
      "- MMM: abbreviated month name;",
      "- MMMM: full month name;",
      "Year:",
      "- y: last one or two digits of the year;",
      "- yy: last two digits of the year;",
      "- yyyy: year;",
      "Hour:",
      "- h: hour from 0 to 12 without leading zero;",
      "- hh: hour from 0 to 12 WITH leading zero;",
      "- H: hour from 0 to 24 without leading zero;",
      "- HH: hour from 0 to 24 WITH leading zero;",
      "Minute:",
      "- m: minutes without leading zero;",
      "- mm: minutes WITH leading zero;",
      "Second:",
      "- s: seconds without leading zero;",
      "- ss: seconds WITH leading zero;",
      "AM Designator:",
      "- t: first letter of AM or PM;",
      "- tt: AM or PM.",
      "",
      "If you want to output any of these characters then precede it with a backslash (\\).",
      "Changing the environment date format does not change the way the FormatDateTime function formats the dates.",
    ],
    group: "Format",
    parameters: [
      {
        name: "value",
        type: "DateTime",
        description: "The Date Time to be formatted.",
        mandatory: true,
      },
      {
        name: "format",
        type: "Text",
        description: "The formatting pattern.",
        mandatory: true,
      },
    ],
    examples: [
      'FormatDateTime(#2015-05-21 22:20:30#, "yyyy-MM-dd HH:mm:ss") = "2015-05-21 22:20:30"',
      'FormatDateTime(#2015-05-01 09:05:03#, "d/M/yy H:m:s") = "1/5/15 9:5:3"',
      'FormatDateTime(#2015-05-21 22:20:30#, "hh:mm tt") = "10:20 PM"',
      'FormatDateTime(#2015-05-21 00:20:30#, "h:mm t") = "12:20 A"',
      'FormatDateTime(#2015-05-21#, "\\d\\d: dd") = "dd: 21"',
      'FormatDateTime(#2015-06-09 10:05:20#, "ddd, dd MMM yyyy") = "Tue, 09 Jun 2015"',
      'FormatDateTime(CurrDateTime(), "To\\da\\y i\\s: dddd") = "Today is: Tuesday"',
    ],
    returnType: "Text",
    jsParser: ([value, format]) => `__osFormatDateTime(${value}, ${format})`,
    javascriptDependency: FormatDateTimeRuntime,
  },
  {
    label: "FormatDecimal",
    description: [
      "Builds a Text output of the specified Decimal 'value', using 'decimal_digits' after the decimal point. The decimal point is specified using 'decimal_separator', while the thousands can be separated with the 'group_separator'.",
      "",
      "When rounding, the function behaves differently depending on where you use it:",
      "",
      "- In the application server, it applies the method round half up (rounds to the nearest integer, 0.5 rounds up).",
      "- In client-side logic, it applies the method round half to even (rounds to the nearest integer, 0.5 rounds to the nearest even integer).",
    ],
    group: "Format",
    parameters: [
      {
        name: "value",
        type: "Decimal",
        description: "The Decimal value to be formatted.",
        mandatory: true,
      },
      {
        name: "decimal_digits",
        type: "Integer",
        description: "The number of decimal digits.",
        mandatory: true,
      },
      {
        name: "decimal_separator",
        type: "Text",
        description: "The decimal separator symbol.",
        mandatory: true,
        defaultValue: '"."',
      },
      {
        name: "group_separator",
        type: "Text",
        description: " The group separator symbol.",
        mandatory: true,
        defaultValue: '","',
      },
    ],
    examples: [
      'FormatDecimal(1.2, 1, "#", ".") = "1#2"',
      'FormatDecimal(1.2, 3, ",", ".") = "1,200"',
      'FormatDecimal(1.24, 1, ",", ".") = "1,2"',
      'FormatDecimal(1.25, 1, ",", ".") = "1,3" (in the application server) or "1,2" (in client-side logic)',
      'FormatDecimal(1.251, 1, ",", ".") = "1,3"',
      'FormatDecimal(1.35, 1, ",", ".") = "1,4"',
      'FormatDecimal(12345.67, 2, ",", ".") = "12.345,67"',
      'FormatDecimal(-12345.67, 2, ",", ".") = "-12.345,67"',
    ],
    returnType: "Text",
    jsParser: ([value, decimal_digits, decimal_separator, group_separator]) =>
      `__osFormatNumber(${value}, ${decimal_digits}, ${decimal_separator}, ${group_separator})`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "FormatPercent",
    description: [
      "Builds a Text output of the specified Decimal 'value', followed by '%' using 'decimal_digits' after the decimal point. The decimal point is specified using 'decimal_separator'.",
      "",
      "When rounding, the function behaves differently depending on where you use it:",
      "",
      "- In the application server, it applies the method round half up (rounds to the nearest integer, 0.5 rounds up).",
      "- In client-side logic, it applies the method round half to even (rounds to the nearest integer, 0.5 rounds to the nearest even integer).",
    ],
    group: "Format",
    parameters: [
      {
        name: "value",
        type: "Decimal",
        description: "The Decimal value to format as a percentage.",
        mandatory: true,
      },
      {
        name: "decimal_digits",
        type: "Integer",
        description: "The number of decimal digits to use.",
        mandatory: true,
      },
      {
        name: "decimal_separator",
        type: "Text",
        description: "The symbol to use as decimal separator.",
        mandatory: true,
        defaultValue: '"."',
      },
    ],
    examples: [
      'FormatPercent(0.12, 3, "#") = "12#000%"',
      'FormatPercent(0.124, 0, ",") = "12%"',
      'FormatPercent(0.125, 0, ",") = "13%" (in the application server) or "12%" (in client-side logic)',
      'FormatPercent(0.1251, 0, ",") = "13%"',
      'FormatPercent(0.135, 0, ",") = "14%"',
      'FormatPercent(12345.6789, 2, ",") = "1234567,89%"',
      'FormatPercent(-12345.6789, 2, ",") = "-1234567,89%"',
    ],
    returnType: "Text",
    jsParser: ([value, decimal_digits, decimal_separator]) =>
      `(__osFormatNumber(__osShift(${value}, 2), ${decimal_digits}, ${decimal_separator}, "") + "%")`,
    javascriptDependency: NumberRuntime,
  },
  {
    label: "FormatPhoneNumber",
    description:
      "Builds a Text output of the specified phone number, starting with the international separator, followed by the first 'int_code_digits' digits, then the 'area_separator', then the following 'area_code_digits', then the 'phone_separator' and finally the remaining 'phone_digits'.",
    group: "Format",
    parameters: [
      {
        name: "value",
        type: "Text",
        description: "The phone number to be formatted.",
        mandatory: true,
      },
      {
        name: "int_code_digits",
        type: "Integer",
        description: "The number of digits composing the international code.",
        mandatory: true,
      },
      {
        name: "area_code_digits",
        type: "Integer",
        description: "The number of digits composing the area code.",
        mandatory: true,
      },
      {
        name: "phone_digits",
        type: "Integer",
        description: "The number of digits composing the phone number without international or area codes.",
        mandatory: true,
      },
      {
        name: "int_separator",
        type: "Text",
        description: "The symbol for the international code.",
        mandatory: true,
      },
      {
        name: "area_separator",
        type: "Text",
        description: "The symbol to use as separator between the international code and the area code.",
        mandatory: true,
      },
      {
        name: "phone_separator",
        type: "Text",
        description: "The symbol to use as separator between the area code and the phone number.",
        mandatory: true,
      },
    ],
    examples: [
      'FormatPhoneNumber("351214153737", 3, 2, 7, "+", "-", ".") = "+351-21.4153737"',
    ],
    returnType: "Text",
    jsParser: (args) => `((value, intDigits, areaDigits, phoneDigits, intSeparator, areaSeparator, phoneSeparator) => {
        const area = intDigits + areaDigits;
        return intSeparator + value.slice(0, intDigits) + areaSeparator + value.slice(intDigits, area) +
          phoneSeparator + value.slice(area, area + phoneDigits);
      })(${args.join(", ")})`,
  },
  {
    label: "FormatText",
    description: [
      "Builds a Text output of the specified Text 'value', by limiting it to the specified 'max_chars' count.",
      "If 'value' has less than 'min_chars' characters, enough 'padding_char' characters are added to expand the length to that limit.",
      "The 'left_padding' parameter determines where padding is added. When 'value' is too long, the characters on the same side are the ones dropped.",
    ],
    group: "Format",
    parameters: [
      {
        name: "value",
        type: "Text",
        description: "The Text to be formatted.",
        mandatory: true,
      },
      {
        name: "min_chars",
        type: "Integer",
        description: "The minimum number of characters in the output.",
        mandatory: true,
      },
      {
        name: "max_chars",
        type: "Integer",
        description: "The maximum number of characters in the output.",
        mandatory: true,
      },
      {
        name: "left_padding",
        type: "Boolean",
        description: "Indicates in which side the Text is padded: True for the left, False for the right.",
        mandatory: true,
      },
      {
        name: "padding_char",
        type: "Text",
        description: "The character to use for padding the string to the minimum length.",
        mandatory: true,
      },
    ],
    examples: [
      'FormatText("123456789", 3, 9, True, "#") = "123456789"',
      'FormatText("123456789876", 3, 9, True, "#") = "456789876"',
      'FormatText("123456789876", 3, 9, False, "#") = "123456789"',
      'FormatText("12345", 10, 20, True, "#") = "#####12345"',
      'FormatText("12345", 10, 20, False, "#") = "12345#####"',
    ],
    returnType: "Text",
    jsParser: (args) => `((value, minChars, maxChars, leftPadding, paddingChar) => {
        if (value.length > maxChars)
          value = leftPadding ? value.slice(value.length - maxChars) : value.slice(0, maxChars);
        return leftPadding ? value.padStart(minChars, paddingChar) : value.padEnd(minChars, paddingChar);
      })(${args.join(", ")})`,
  },
];

const EmailFunctions: OutSystemsLangFunction[] = [];

const EnvironmentFunctions: OutSystemsLangFunction[] = [];

const URLFunctions: OutSystemsLangFunction[] = [];

const MiscellaneousFunctions: OutSystemsLangFunction[] = [];

const RolesFunctions: OutSystemsLangFunction[] = [];

/**
 * Service Studio's text colors (sampled from its light editor: functions #0000ff,
 * Text #800000, the rest black), lightened with the same hue to be readable on the
 * app's dark editor. Keywords, True/False and comments follow the same palette.
 */
const OutSystemsTokenColors: CustomLanguageTokenColors = [
  { token: "function", foreground: "9494ff" },
  { token: "keyword", foreground: "9494ff" },
  { token: "constant", foreground: "9494ff" },
  { token: "string", foreground: "e08585" },
  { token: "comment", foreground: "00a300" },
  // Black in Service Studio, so the editor's regular text color here
  { token: "identifier", foreground: "e8eaed" },
  { token: "number", foreground: "e8eaed" },
  { token: "date", foreground: "e8eaed" },
  { token: "operator", foreground: "e8eaed" },
  { token: "delimiter", foreground: "e8eaed" },
];

export const OutSystemsLang: CustomLanguage & {
  functions: Array<OutSystemsLangFunction>;
} = {
  id: "outsystems",
  functions: [
    ...UncategorizedFunctions,
    ...MathFunctions,
    ...NumericFunctions,
    ...TextFunctions,
    ...DateAndTimeFunctions,
    ...DataConversionFunctions,
    ...FormatFunctions,
    ...EmailFunctions,
    ...EnvironmentFunctions,
    ...URLFunctions,
    ...MiscellaneousFunctions,
    ...RolesFunctions,
  ],
  literals: [TextLiteral, DateLiteral, BooleanLiteral],
  operators: Operators,
  keywords: [
    // {
    //   label: "If",
    //   insertText: "If(${1},${2},${3})",
    // },
    {
      label: "and",
      insertText: "and",
    },
    {
      label: "or",
      insertText: "or",
    },
    {
      label: "not",
      insertText: "not",
    },
  ],
  lineComment: "//",
  tokenColors: OutSystemsTokenColors,
};
