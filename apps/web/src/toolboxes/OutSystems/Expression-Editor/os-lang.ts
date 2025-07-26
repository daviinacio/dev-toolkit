import { CustomLanguage, CustomLanguageFunction } from "@/lib/custom-lang";
import { dateTimeToString, dateToString, NewLine } from "common/lib/utils";

export type OutSystemsLangFunction = CustomLanguageFunction & {
  group?: string;
};

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
    examples: ["Mod(10, 3) = 1", "Mod(4, 3.5).5"],
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
      fractionalDigits
        ? `(Math.round(${n} * Math.pow(10, ${fractionalDigits})) / Math.pow(10, ${fractionalDigits}))`
        : `Math.round(${n})`,
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
        mandatory: true,
      },
      {
        name: "m",
        type: "Decimal",
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
        mandatory: true,
      },
      {
        name: "m",
        type: "Decimal",
        mandatory: true,
      },
    ],
    examples: ["Max(-10.89, -2.3) = -2.3", "Max(10.89, 2.3) = 10.89"],
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
    examples: ["Sign(-10.89) = -1", "Sign(2.3) = 1", "Sign(0.0)"],
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
    jsParser: ([t1, t2]) => `String(${t1}).concat(${t2})`,
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
    jsParser: ([text]) =>
      `(() => {const div = document.createElement('div'); div.innerText = ${text}; return div.innerHTML;})()`,
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
      'EncodeJavaScript("another \' test") = "another \x27 test"',
      'EncodeJavaScript("<>") = "\x3c\x3e"',
    ],
    returnType: "Text",
    jsParser: ([text]) =>
      `(String(${text}).split("").map((char) => "\\\\x" + char.charCodeAt(0).toString(16).padStart(2, "0")).join(""))`,
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
    jsParser: ([text]) => `encodeURIComponent(${text})`,
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
    jsParser: ([t = '""', search, startIndex, searchFromEnd, ignoreCase]) => {
      if (ignoreCase === "true") {
        t = `${t}.toLowerCase()`;
        search = `${search}.toLowerCase()`;
      }
      if (searchFromEnd === "true")
        return `${t}.lastIndexOf(${search}, ${startIndex})`;
      return `${t}.indexOf(${search}, ${startIndex})`;
    },
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
    examples: ['Length("First string") = 12', 'Length("")'],
    returnType: "Text",
    jsParser: ([t]) => `${t}.length`,
  },
  // {
  //   label: "NewLine",
  //   description:
  //     "Returns a string containing the New Line (Return) character. ",
  //   group: "Text",
  //   parameters: [],
  //   examples: [],
  //   returnType: "Text",
  //   jsParser: () => '"\\r\\n"',
  // },
  // {
  //   label: "NewLine",
  //   description:
  //     "Returns a string containing the New Line (Return) character. ",
  //   group: "Text",
  //   parameters: [],
  //   examples: [],
  //   returnType: "Text",
  //   jsParser: () => '"\\r\\n"',
  // },
  // {
  //   label: "NewLine",
  //   description:
  //     "Returns a string containing the New Line (Return) character. ",
  //   group: "Text",
  //   parameters: [],
  //   examples: [],
  //   returnType: "Text",
  //   jsParser: () => '"\\r\\n"',
  // },
  // {
  //   label: "NewLine",
  //   description:
  //     "Returns a string containing the New Line (Return) character. ",
  //   group: "Text",
  //   parameters: [],
  //   examples: [],
  //   returnType: "Text",
  //   jsParser: () => '"\\r\\n"',
  // },
  // {
  //   label: "NewLine",
  //   description:
  //     "Returns a string containing the New Line (Return) character. ",
  //   group: "Text",
  //   parameters: [],
  //   examples: [],
  //   returnType: "Text",
  //   jsParser: () => '"\\r\\n"',
  // },
  // {
  //   label: "NewLine",
  //   description:
  //     "Returns a string containing the New Line (Return) character. ",
  //   group: "Text",
  //   parameters: [],
  //   examples: [],
  //   returnType: "Text",
  //   jsParser: () => '"\\r\\n"',
  // },
  // {
  //   label: "NewLine",
  //   description:
  //     "Returns a string containing the New Line (Return) character. ",
  //   group: "Text",
  //   parameters: [],
  //   examples: [],
  //   returnType: "Text",
  //   jsParser: () => '"\\r\\n"',
  // },
  {
    label: "NewLine",
    description: "Returns a string containing the New Line (Return) character.",
    group: "Text",
    parameters: [],
    examples: [],
    returnType: "Text",
    jsParser: () => '"\\r\\n"',
  },
];

const DateAndTimeFunctions: OutSystemsLangFunction[] = [
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
    jsParser: () => `new Date("${dateToString(new Date())} ")`,
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
    jsParser: () => `new Date("${dateTimeToString(new Date())} UTC")`,
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
    jsParser: ([dt]) => `(${dt}).getSeconds()`,
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
    jsParser: ([dt]) => `(${dt}).getFullYear()`,
  },
];

const DataConversionFunctions: OutSystemsLangFunction[] = [];

const FormatFunctions: OutSystemsLangFunction[] = [
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
      "If you want to output any of these characters then precede it with ''.",
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
    examples: [],
    returnType: "Date",
    jsParser: ([value, format]) => {
      const convert_24h_12h = `function convert_24h_12h(hours) {
        return hours == 0 ? 12 : ((hours -1) % 12) + 1;
      }`;

      const replaces = {
        yyyy: ".replaceAll('yyyy', String(dt.getFullYear()))",
        yy: ".replaceAll('yy', String(dt.getFullYear().toString().slice(-2)))",
        y: ".replaceAll('y', String(parseInt(dt.getFullYear().toString().slice(-2))))",
        MMMM: ".replaceAll('MMMM', String(dt.toLocaleDateString(navigator.language, { month: 'long' })))",
        MMM: ".replaceAll('MMM', String(dt.toLocaleDateString(navigator.language, { month: 'short' })))",
        MM: ".replaceAll('MM', String(dt.getMonth() + 1).padStart(2, '0'))",
        M: ".replaceAll('M', String(dt.getMonth() + 1))",
        dd: ".replaceAll('dd', String(dt.getDate()).padStart(2, '0'))",
        d: ".replaceAll('d', String(dt.getDate()))",
        HH: ".replaceAll('HH', String(dt.getHours()).padStart(2, '0'))",
        H: ".replaceAll('H', String(dt.getHours()))",
        hh: ".replaceAll('hh', String(convert_24h_12h(dt.getHours())).padStart(2, '0'))",
        h: ".replaceAll('h', String(convert_24h_12h(dt.getHours())))",
        mm: ".replaceAll('mm', String(dt.getMinutes()).padStart(2, '0'))",
        m: ".replaceAll('m', String(dt.getMinutes()))",
        ss: ".replaceAll('ss', String(dt.getSeconds()).padStart(2, '0'))",
        tt: ".replaceAll('tt', dt.getHours() >= 12 ? 'PM' : 'AM')",
        t: ".replaceAll('t', dt.getHours() >= 12 ? 'P' : 'A')",
      };

      return `((dt, f) => {${
        ["hh", "h"].some((it) => format.includes(it))
          ? `\r\n      ${convert_24h_12h}`
          : ""
      }
      return (f)
        ${Object.entries(replaces)
          // .filter(([key]) => format.includes(key))
          // .map(([_, r]) => r)
          .reduce((acc, [key, value]) => {
            if (format.includes(key)) acc.push(value);
            return acc;
          }, [] as Array<string>)
          .join("\r\n        ")}
    })(${value}, ${format})`;
    },
  },
];

const EmailFunctions: OutSystemsLangFunction[] = [];

const EnvironmentFunctions: OutSystemsLangFunction[] = [];

const URLFunctions: OutSystemsLangFunction[] = [];

const MiscellaneousFunctions: OutSystemsLangFunction[] = [];

const RolesFunctions: OutSystemsLangFunction[] = [];

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
};
