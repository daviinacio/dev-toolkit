import { InvalidArgumentError, InvalidOptionArgumentError } from "commander";
import fs from "fs";

export function PathArgument(previous: string) {
  if (!fs.existsSync(previous))
    throw new InvalidArgumentError("No such a file or directory");
  return previous;
}

export function NumericOption(previous: string) {
  const result = parseInt(previous);
  if (Number.isNaN(result))
    throw new InvalidOptionArgumentError("Not a number");
  return result;
}

export function EnumOption<E extends readonly string[], T extends E[number]>(
  enumerator: E
) {
  return (previous: string): T => {
    if (!enumerator.includes(previous)) {
      throw new InvalidOptionArgumentError(
        `Expected '${enumerator.join(" | ")} ', received '${previous}'`
      );
    }
    return previous as T;
  };
}
