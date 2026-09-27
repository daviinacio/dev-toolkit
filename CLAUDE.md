# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Yarn-workspaces monorepo (`apps/*`, `modules/*`) with two apps that expose the same developer tools in two forms:

- `apps/cli` (`dev-toolkit-cli`): a Node CLI published to npm, whose binary is `dtk`. It uses Commander.
- `apps/web` (`dev-toolkit-web`): a React 18 + Vite + Tailwind/shadcn PWA. It is deployed to GitHub Pages at `toolkit.daviinacio.com`.
- `modules/common` (`common`): framework-agnostic TypeScript shared by both apps, such as the CPF/CNPJ/person generators and string/date utils.

There is no test suite. Prettier uses 2-space indentation.

## Commands

Run from the repo root (`run-p` runs the cli and web variants in parallel):

```bash
yarn dev          # tsc -w for the CLI + vite dev server for web
yarn build        # build both
yarn dev:web / yarn build:web / yarn start:web (vite preview)
yarn dev:cli / yarn build:cli
yarn deploy:web   # build, copy index.html -> 404.html (SPA fallback), push dist to gh-pages
```

Web-only lint: `yarn workspace dev-toolkit-web run lint`. The web build (`tsc -b && vite build`) is also the type check.

Try the CLI locally:
```bash
yarn build:cli && node apps/cli/bin/apps/cli/src/main.js cpf generate -c 3 -f
yarn workspace dev-toolkit-cli run link-cli   # installs `dtk` globally via yarn link
```

## Architecture notes

### How the apps consume `modules/common`
The two apps import it in different ways:
- **Web** imports it as a workspace package: `import { validateCpf } from "common/lib/cpf"`.
- **CLI** imports it with **relative paths plus a `.js` extension**: `import ... from "../../../../modules/common/lib/cpf.js"`. The CLI `tsconfig` sets `rootDir: "../.."` and includes `../../modules/common/lib/**`. As a result, `tsc` writes output to `bin/apps/cli/src/...` and `bin/modules/common/...`, and the `bin`/`main` entry is `bin/apps/cli/src/main.js`. The CLI is ESM (`module: Node16`), so every relative import needs the `.js` suffix.

Code in `modules/common` must work in both Node and the browser.

### CLI structure
- `src/main.ts` defines every command and subcommand in Commander, with custom argument parsers from `lib/validation.ts` (`NumericOption`, `EnumOption`, `PathArgument`).
- Each command group's handlers live in `src/actions/action-<name>.ts` and are re-exported as a namespace from `actions/index.ts` (`actions.cpf.generate`).
- `compress` shells out to `ffmpeg` through `lib/bash.ts`. It checks that ffmpeg is installed, detects the GPU (nvidia/amd/intel/mac/cpu via `lspci`/`wmic`), and picks an H.264 encoder to match. On Linux, AMD and Intel use VA-API on `/dev/dri/renderD128`. Images are converted to WebP. Videos are written with a `.compressed` suffix so later runs skip them. **The original files are deleted** after each one compresses successfully.

### Web structure
- Tools are grouped into "toolboxes". The registry is `src/hooks/use-toolbox-list.tsx`, and `src/router.tsx` builds the routes `/<toolbox.path>/<tool.path>` from it. To add a tool, create `src/toolboxes/<Toolbox>/<Tool>/index.tsx` and register it in that list; the sidebar and routes pick it up automatically.
- Tool pages that have a CLI equivalent render `<CliUsage commands={[...]}/>` (`components/cli-usage.tsx`) to show the matching `dtk` commands.
- `@/` is an alias for `apps/web/src`. `components/ui/*` holds shadcn components (`components.json`).
- **OutSystems Expression Editor**: `lib/custom-lang.ts` defines a generic `CustomLanguage` model, a set of functions where each has a `jsParser` that emits JS, and `transpileCustomCodeToJavascript`. `toolboxes/OutSystems/Expression-Editor/os-lang.ts` is the large table of OutSystems built-in functions. The page transpiles the user's expression and evaluates it with `new Function`. `components/ui/code-editor.tsx` registers custom languages with Monaco (completion and hover come from the function metadata).
- PWA: `vite-plugin-pwa` in `autoUpdate` mode. Monaco loads from jsDelivr and is cached at runtime (`vite.config.ts`).
