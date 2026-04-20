#!/usr/bin/env node

import { Command, CommanderError } from "commander";
// import { ZodError } from "zod";
import { FileType } from "./actions/action-compress.js";
import * as actions from "./actions/index.js";
import { Resolution } from "./lib/constants.js";
import { EnumOption, NumericOption, PathArgument } from "./lib/validation.js";

/** Setup */
const program = new Command();
program
  .name("dev-toolkit")
  .description("A simple CLI app to help developers in their tasks.");

program
  .command("compress")
  .description("Compress large files and save storage space.")
  .argument("<pathname>", "Pathname", PathArgument)
  .option(
    "-V, --verbose <number>",
    "Level of pathname to log",
    NumericOption,
    10
  )
  .option("-T, --type <string>", "File type", EnumOption(FileType))
  .option(
    "-R, --resolution <string>",
    "Resolution",
    EnumOption(Resolution),
    "480p"
  )
  .option("-F, --force", "Ignores compressed flag")
  .option("-H, --horizontal", "Force horizontal 16x9 aspect ratio")
  .action(actions.compress.file);

const cpf = program
  .command("cpf")
  .description("Generate or validate Brazilian CPF numbers.");

cpf
  .command("generate")
  .description("Generate one or more valid CPF numbers.")
  .option("-c, --count <number>", "How many CPFs to generate", NumericOption, 1)
  .option("-f, --formatted", "Output with punctuation (000.000.000-00)", false)
  .action(actions.cpf.generate);

cpf
  .command("validate")
  .description("Validate a CPF number.")
  .argument("<cpf>", "CPF number (with or without punctuation)")
  .action(actions.cpf.validate);

const cnpj = program
  .command("cnpj")
  .description("Generate or validate Brazilian CNPJ numbers.");

cnpj
  .command("generate")
  .description("Generate one or more valid CNPJ numbers.")
  .option("-c, --count <number>", "How many CNPJs to generate", NumericOption, 1)
  .option(
    "-f, --formatted",
    "Output with punctuation (00.000.000/0000-00)",
    false
  )
  .action(actions.cnpj.generate);

cnpj
  .command("validate")
  .description("Validate a CNPJ number.")
  .argument("<cnpj>", "CNPJ number (with or without punctuation)")
  .action(actions.cnpj.validate);

const person = program
  .command("person")
  .description("Generate fictional Brazilian person data.");

person
  .command("generate")
  .description("Generate one or more fictional person records as JSON.")
  .option("-c, --count <number>", "How many records", NumericOption, 1)
  .option("-p, --pretty", "Pretty-print JSON", false)
  .action(actions.person.generate);

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof CommanderError) {
    console.log(`Error (${err.code}): ${err.message}`);
  } else if (err instanceof Error) {
    if (process.env.NODE_ENV === "development") {
      console.error(err);
    } else {
      console.error(err.message);
    }
  }
});
