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
