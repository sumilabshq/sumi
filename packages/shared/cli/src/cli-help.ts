export const CLI_HELP = `widgetarium <command>

  create <dir> [--name <app>] [--system <id>] [--engine <folder>] [--no-git] [--no-install]
      a new app in an empty folder: Vite, React, TypeScript, Tailwind, zod and the kit copied in;
      --system picks the design system whose tokens.css lands in src/styles/tokens.css (default);
      --engine names the folder holding the engine tarballs (inside the repo it is packed for you)

  system check <id> | use <id> [--dir <app>]
      check: the guard over a design system package (files, sections, the token contract, 4.5:1
      contrast in both themes across every hue); use: rewrites the app's tokens.css and design docs
      from that system and names it in widgetarium.json

  check [dir]
      reads widgetarium.json and checks every layer: duplicate names, refused widgets, unreadable
      boards; exits 1 on findings

  catalogue list | search <words> | show <id> [--registry <folder or URL>] [--json]
      the widgets the registries offer: widgetarium.json's catalogue.registries, or this repo's
      registry/ when run inside it; show prints a card: props, commands, files, libs, dependencies

  add <id> [--as <name>] [--registry <folder or URL>]
      copies a catalogue widget into the project's widgets folder, its scope's libs into libs with
      the imports rewritten to the alias, its npm dependencies into package.json, and origin.json
      beside it; never over a widget of the same name

  add module <name> --on Server|Device|Anywhere [--in domain|state]
      a data module in packages/<domain|state>/<name> (domain by default): package.json, tsconfig.json,
      LICENSE, module.ts and its parts picker in gateways/<name>-parts/; registers the workspace and
      test:types, then runs generate; never over an existing folder or package name

  add feature <module>/<feature> [--query <Name>] [--command <Name>]
      features/<feature>/requests.ts with an example query (the default) and/or command, its schema in
      shared/schema/, a gateway with a memory implementation wired into the module's parts, the
      requests listed in module.ts .public(...), tools/<module>-<feature>-checks.ts; then generate

  generate [module folder…] [--check]
      a module(...) package: generated/contract.ts (its listed requests up to their first handling
      step, with every schema they use) and the root index.ts; a client package: the root
      index.ts; an older module: generated/index.ts, module.ts and gateways.ts; removes stray files
      under generated/; with no folder, every package marked widgetarium.level "domain" or
      "client"; --check writes nothing and exits 1 naming each package whose files are stale`;

export const HELP_WORDS: readonly string[] = ["help", "--help", "-h"];
