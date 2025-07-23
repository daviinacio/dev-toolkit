import { CustomLanguage, CustomLanguageFunction } from "@/lib/custom-lang";
import { dateTimeToString, dateToString } from "common/lib/utils";

export type OutSystemsLangFunction = CustomLanguageFunction & {
  group: string;
};

export const OutSystemsLang: CustomLanguage & {
  functions: Array<OutSystemsLangFunction>;
} = {
  id: "outsystems",
  functions: [
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
      jsParser: ([n = 0]) => `Math.abs(${n})`,
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
      jsParser: ([n = 0, m = 0]) => `(${n} % ${m})`,
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
        "Power(-10.89, 2.3) = 0",
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
      ].join("\r\n"),
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

    // Numeric
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
      label: "CurrDate",
      description: [
        "In client-side calls, it returns the device date.",
        "In server-side calls, it returns the platform server date.",
        "In query calls, it returns the platform server date. ",
      ].join("\r\n"),
      group: "Date and Time",
      parameters: [],
      examples: [],
      returnType: "Date",
      jsParser: () => `"${dateToString(new Date())}"`,
    },
    {
      label: "CurrDateTime",
      description: [
        "In client-side calls, it returns the device date and time. It also returns milliseconds.",
        "In server-side calls, it returns the platform server date and time.",
        "In query calls, it returns the platform server date and time.",

        "Date times in the device are converted in the server to the server time zone.",
        "Conversely, date times in the server are converted in the device to the device time zone. ",
      ].join("\r\n"),
      group: "Date and Time",
      parameters: [],
      examples: [],
      returnType: "DateTime",
      jsParser: () => `"${dateTimeToString(new Date())}"`,
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
      jsParser: ([dt]) => `(new Date(${dt}).getSeconds())`,
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
      jsParser: ([dt]) => `(new Date(${dt}).getFullYear())`,
    },
  ],
  keywords: [
    {
      label: "If",
      insertText: "If(${1},${2},${3})",
    },
  ],
  lineComment: "//",
};
