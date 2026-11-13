# Widgetarium

The product is the Tauri desktop studio (`apps/tauri`, `apps/studio`). The vault widget system (boards, tiles, the catalogue, `registry/`) is legacy.

## Architecture

The architecture is `docs/architecture/`, loaded here in full. Where this file and those pages disagree, the
pages win, and a change to the architecture changes them in the same commit.

**CRITICAL — one request system, never a second.** Every call between an app, the shell and a module is a
command or query of a module over a transport (`docs/architecture/requests.md`: `RemoteTransport`,
`runtime()` exposed by an adapter, `.imports(X({ over: transport }))`; identity from `Authenticate`, permissions by
guards, tracking by middleware, push by the transport's `changes`). A new boundary (iframe, window, process)
gets a new transport, never a new message vocabulary. A design or diff introducing "services", `ask`/`answer`,
`op: "read" | "write"`, a bridge protocol or an events channel beside requests is refused on sight. It happened
once: `@sumi/contract` got `ask { service, input }` with a `storage` read/write service, five agents built on
it, and all of it had to be redone.

**CRITICAL — a plugin owns its data; the host knows no plugin.** A plugin owns its modules and what other
plugins hand it through its API (`.apply((app) => api)`); only its own code reads that, and everyone else
reaches the data through its module's queries, commands and events (`docs/architecture/plugins.md`). The
host provides generic services (`backend`, `windows`, `shell`) and starts or draws only what plugins register
through them; it never reads another plugin's API or configures a module with its data. `appHost({ apps })`
did exactly that and was rewritten.

**CRITICAL — the machine is reached only through the Sumi contract.** The file system and terminal
sessions are the host's capabilities, and every plugin and app reaches them through `@sumi/contract`
(`fileSystem.files.read`, `terminal.lines.output`, …), never through Tauri. They are not a reason a plugin "cannot" do
something: a plugin that needs the machine sends a contract request. `sumi-host` and its services
(`backend`, `windows`, `shell`) are part of that contract, the base every plugin builds on; a module
runs in the background because a plugin registers it with `app.use(backend).module(...)`, and the host starts
it. Nothing in host code names a plugin's module.

**CRITICAL — the plugin layout is a requirement, not a preference.** Every plugin is
`plugins/<name>/`, or `plugins/<group>/<name>/` inside a group folder that holds only plugins (`plugins/ai/`), and nothing else: `src/plugin.ts` (always; only the `plugin()` definition, no helper,
schema or type), `src/index.ts` (only re-exports), `src/generated/plugin.ts` (written by `data-framework generate`), every other file of `src/` placed as in a client package
(`features/<feature>/ui/<block>/*.tsx` with the `.css` a block uses beside it, `features/<feature>/lib/*.ts`,
`shared/ui/` and `shared/lib/` for what two features use, nothing else loose in `src/`, no feature importing
another's `lib/`), and `data/<module>/` (when it owns modules: each a data module package). A module outside
`data/`, a plugin outside `plugin.ts` or a file out of its place fails
`npm run test:plugin-layout`, and the `plugin-layout-reviewer` agent refuses the change; until the layout is
right, no other quality of the change counts. `docs/architecture/plugins.md#layout`.

@docs/architecture/README.md

@docs/architecture/layers.md

@docs/architecture/placement.md

@docs/architecture/requests.md

@docs/architecture/code-style.md

@docs/architecture/views.md

@docs/architecture/hosts.md

@docs/architecture/plugins.md

@docs/architecture/lint.md

@docs/architecture/legacy.md

**Code style, every rule enforced by a tool, never by memory**: tabs, width 4. `if` and `for` always
take braces and a body on its own line, even a lone `return`. An object literal is always spread over
lines, one property per line. More than three parameters or arguments go one per line, and a declaration
takes at most three (more → one object). Blank lines separate a group of declarations from the logic and
stand around `if`/`for` blocks. `===`, `const` unless reassigned, no nested ternaries, no `else` after
`return`, object shorthand, one statement per line. ESLint Stylistic formats `.ts`/`.tsx` (`eslint --fix`),
Prettier the rest; a hook formats every edit, and `npm test` fails on a violation.

**Everything is strict TypeScript.** `packages/shared/kit` and every package under `domain`, `state` and `client`
is TSX (JSX with the classic `h` factory, one component per file); `packages/shared/core`
is `.ts` React with `h()` hyperscript, **no JSX there**; `tools/` is `.ts` too. `npm run test:types` gates it all
(`tsc -b`, then the `double-cast` lint): no `any`, no `as unknown as`, no `!`; data from outside arrives
`unknown` and is narrowed by a guard.

**The repository is an npm-workspaces monorepo, and the arrows between its parts point one way.**

```
apps/tauri               FSL  the desktop host: windows, workspaces, the machine's capabilities; the product
apps/tauri/capabilities/* FSL the modules only the host runs on the machine: terminal, file-system
apps/studio              FSL  @widgetarium/studio: the studio drawn around an app
apps/server              FSL  Hono: serves /rpc for modules that run on a server
      ↓
plugins/sumi-host        FSL  @sumi/sumi-host-plugin: the host's services (backend, windows, shell, agents), the window offers, and what a window lends drawn plugins (AskComposerContext, TabFaceContext, OPENS_LAYER_MARK); runs nothing
plugins/main             FSL  @sumi/main-plugin: the app as it was before plugins; shrinks as pieces move out
plugins/apps             FSL  @sumi/apps-plugin: API app(entry), its modules (plugins/apps/data/apps, @sumi/apps; plugins/apps/data/places, @widgetarium/places: tabs, windows and history, configured with each app's declared tab rules; plugins/apps/data/app-host, @widgetarium/app-host: a window's tabs, essentials, groups and splits, run in each window through windows.moduleOf) and the app tab page
plugins/terminal         FSL  @sumi/terminal-plugin: the Terminal app, added through apps
plugins/browser-page     FSL  @sumi/browser-page-plugin: the Browser app, added through apps, and its module (plugins/browser-page/data/web-page, @widgetarium/web-page) served to every frame through shell.frameModule
plugins/command-menu     FSL  @sumi/command-menu-plugin: API door, page, rowSource; its module (plugins/command-menu/data/command-menu, @sumi/command-menu) and its window layer
plugins/ai/chat             FSL  @sumi/chat-plugin: a view of the agent core; its modules (plugins/ai/chat/data/mascot, plugins/ai/chat/data/chat-tabs: the chat list and which chat a new or empty pane opens), the chat tab page, the Ask composer (a window provider), the questions background module and the menu's Ask door ⌘I with its page
plugins/ai/agent            FSL  @sumi/agent-plugin: the agent core every agent interface reads; owns the assistant module (plugins/ai/agent/data/assistant, @widgetarium/assistant: sessions, turns, the chosen model) served per window, and MCP: API mcp.addServer({ name, modules }), each plugin's own MCP server, run in each window and handed to agents through agents.mcpServer, with its module (plugins/ai/agent/data/mcp, @sumi/mcp) listing them
plugins/ai/questions        FSL  @sumi/questions-plugin: the questions module (plugins/ai/questions/data/questions), the dock drawn in the chat through a slot, the ask tools (plugins/ai/questions/data/ask) as the questions MCP server
plugins/ai/composer-expand  FSL  @sumi/composer-expand-plugin: the toggle that grows the chat composer over the chat, through the chat.frame and chat.composer-bar slots
plugins/ai/slash-commands   FSL  @sumi/slash-commands-plugin: the composer's / menu of commands and skills and the accent on a typed command, through chat.composer-input
plugins/ai/claude-code      FSL  @sumi/claude-code-plugin: the Claude Code runner: agent.addRunner with its models, their options (mode, effort), its usage meter and launchOf, which turns the host's TurnFacts into the claude command line the host starts as it is
plugins/ai/working-folder   FSL  @sumi/working-folder-plugin: the composer's folder menu for a new chat, through chat.options-start
plugins/ai/permission-mode  FSL  @sumi/permission-mode-plugin: the composer's permission mode select (the chosen model's `mode` option), through chat.options-start
plugins/ai/plan-usage       FSL  @sumi/plan-usage-plugin: the composer's usage ring and menu (the runner's `usage` meter), through chat.options-end
plugins/ai/model-picker     FSL  @sumi/model-picker-plugin: the composer's runner and model menu, through chat.options-end
plugins/ai/effort-picker    FSL  @sumi/effort-picker-plugin: the composer's effort select (the chosen model's `effort` option), through chat.options-end
plugins/tasks            FSL  @sumi/tasks-plugin: the tasks module (plugins/tasks/data/tasks), the Tasks app, the chat's tasks UI through slots, the task tools (plugins/tasks/data/task-work) as the tasks MCP server
      ↓
packages/domain/*             business data modules: workspaces, browser, canvas, fixture-billing
packages/state/*              app-state data modules: layout, appearance
      ↓
packages/shared/data-framework FSL @widgetarium/data-framework: requests, modules, mediator, transports, hooks
packages/shared/plugin-framework FSL @widgetarium/plugin-framework: plugins (require, optional, apply), services, UI slots (PluginSlot, ListPluginSlot from /react) and the plugin runtime with its per-workspace state (sumi.plugins.json); the Tauri host starts one per workspace
packages/shared/core     FSL  the widget engine (legacy)
packages/shared/kit      MIT  everything drawn: TSX, one file per kit item
packages/shared/behaviors     headless behaviors: drag, scroll, the Tauri store client
packages/shared/cli      FSL  the `data-framework` bin: generate, create, check, catalogue, add
packages/shared/eslint-plugin the framework's lint rules
packages/shared/vite     FSL  @widgetarium/vite: dev and build run the app, --mode studio the studio around it
packages/shared/packs/*  MIT  widget query and command implementations (legacy)
packages/shared/sdk      FSL  what a widget author compiles against (legacy)
registry/                MIT  the widget library (legacy)
```

`packages/` holds only the four layer folders `domain/`, `state/`, `client/` and `shared/`; hosts are apps; each plugin is a folder of `plugins/` or of a group folder in it (`plugins/ai/`). Only `apps/tauri` touches Tauri: anywhere else an import of `@tauri-apps/*` fails the build and the test loader (`apps/tauri/tauri-reach.mts`, `npm run test:tauri-boundary`).

**The engine ships as versioned packages.** Every published package's `exports` carries three
conditions: `source` → `src` (the monorepo and the test loader resolve it), `types`
and `default` → `dist`. A new tsconfig or esbuild call inside the repo sets the `source` condition, or
it reads a `dist` that `npm run pack:engine` deletes after packing. `npm run pack:engine` builds and
packs each one into `dist-packages/`; `npm run test:engine-package` installs the tarballs into a
project outside the repo and type-checks a widget there. Widgets import `z` from `zod`; the engine
hands `zod` to vault widgets like React.

**Kit imports nothing but React, tailwind-merge and, behind `/charts` and `/showcase` alone, Recharts; core never
imports the app.** A plate law lives in
`packages/shared/kit/src/utils/plate-laws.ts` (the words in `constants/surfaces.ts`) because `Card` answers it, and `tree.ts` and `surface-roles.ts`
re-export it from there. The app reaches core as `@widgetarium/core/<file>` and the kit as
`@widgetarium/kit[/surface|/plates|/icons|/emoji-table|/emojis|/charts|/shapes|/showcase]` — the kit's
`package.json` `exports` is the one list of its entry points, and the test loader resolves
`@widgetarium/*` through it. Every tool runs from the repo root. A second host is another
`apps/host-*` beside `host-tauri`, never a branch inside core. Licences: each package folder carries its own `LICENSE`; the root `LICENSE` is only the
map of which folder is MIT and which FSL-1.1-ALv2, and `REUSE.toml` maps paths to them.

## Sumi — the studio's design system

**Sumi ("Quiet UI") is the one design system of the studio and the Tauri app.** The package is
`design-systems/sumi/` (`DESIGN.md`, `tokens.css`, the runtime `sumi.css` with every `--sumi-*` token), the
approved brief is `design-systems/sumi/references/quiet-ui-brief.md`, and the boards are the canvas
"Studio two layers" (https://claude.ai/artifact/4YPtzqciNLEEfHLBeJZePw), copied as artboards into
`docs/reference/sumi-layout/`. Sumi is also the mascot's name.

- **The design is the single source of truth.** A component — kit included — that does not render like the
  board at rest, hover, pressed, open and selected, light and dark, is changed until it does; the kit gives
  behaviour and motion, never its own look. A component that differs from the design is not accepted.
  Check it on the real studio build, never only on a test page.
- **Exactness: everything stands on shared lines.** Neighbouring blocks align on common guides even when they
  are different plates: the sidebar's top-row icons sit on the same line as the plate headers' icons (the
  sidebar takes the top padding that puts them there), list icons share one size and one left edge, text in
  neighbouring rows starts on one axis, and every gap is a step of the 4px scale, the same wherever the same
  relation repeats. The boards keep this; an implementation that breaks it is wrong even when each block
  alone matches.
- Quiet: hierarchy from text and spacing, controls ghost until hovered, one loud thing per view, monochrome
  with blue only as a wash, no borders and no inner plate around app content, no uppercase labels.
- **A divider runs edge to edge.** A line inside a card, menu or list reaches both edges of its card, never
  inset by the card's padding; the command menu is the reference. A board that draws it inset is wrong here.

## Design systems from references

When the person sends pictures and describes a design, write it as an OpenDesign package in
`design-systems/<id>/` — `manifest.json`, `USAGE.md`, `DESIGN.md`, `tokens.css`, `preview/` and the
pictures under `references/` — by the format in `design-catalogue/README.md`, and run
`data-framework system check <id>` (`npm run test:design-systems` checks every one). **The token contract is
shadcn's names** (`packages/shared/kit/src/constants/token-contract.ts`): `tokens.css` declares a few numeric
parameters and every colour as an `oklch()` formula of them, in `:root` and in `.dark, .theme-dark`, so
`--hue` re-derives both themes; the kit reads those names and `--wg-kit-*` are aliases onto them. The
board sheet (`packages/shared/core/board.css`) carries `design-systems/default/tokens.css`, laid as `@layer wg-system` by the build,
and `npm run test:system-tokens` holds it to the colours Obsidian drew before the flip. What cost the most to learn:

- **A system is not the product it came from.** The domain, data and screens stay behind; a build
  that reuses them is a copy and is rejected.
- **Colour is an algorithm**: steps, their jobs, lightness and chroma ranges, a free tint and fixed
  status meanings, written for **light and dark** themes. Never only hex values.
- **Images have a role and a kind**, and the system says where to find that kind for another domain.
- **Look, structure and behaviour are three layers**; the source's business features are not written.
- **The source's screens are not templates.** A build designs its structure from its own tasks; a
  screen that reads as a reference with the nouns changed is a copy. A system describes layout as
  principles, never as one screen's panel list — that list was copied 1:1 on 2026-10-10.
- **Pictures are found, never drawn.** No hand-made SVG art, maps, bodies or objects, no edge-detected
  photos: measured, both came out amateur. Code draws only charts and interface geometry; everything
  else is a sourced file or a labelled placeholder.
- **No borders on plates** in a blur system: separation is blur and fill.
- **A design book or a test product obeys the system it shows**: a no-plates system has no plates in
  its book. Test builds run on Opus at low effort: on 2026-10-10 it took 7 minutes against 17–21 at default effort, with ideas as strong and less detail.

## Verification

**Falsification is the rule: a check that cannot be broken on purpose proves nothing.** For every
check, mutate the source to violate the law it claims, confirm it goes red, restore with a
uniqueness-asserted targeted edit, verify by md5. If a check turns out unfalsifiable, delete it —
along with whatever depends on it — rather than ship it.

**Tests import the real sources; nothing is copied.** Every `node tools/…` script in `package.json`
runs under `node --single-threaded --import ./tools/loader/register.mts`, an in-memory loader that compiles `.ts`,
`.tsx` and `.jsx` with esbuild (`h`/`Fragment`, the
nearest `tsconfig.json`, `es2020`), resolves extensionless and `.js` specifiers to the `.ts` behind
them and `@widgetarium/*` through each package's `exports`, and reads `.md` and `.css` as text. A test imports `../packages/shared/core/src/<file>`; an edit shows in the next run with no
rebuild, and suites run side by side. A tool run by hand needs the same two flags.
`--single-threaded` is not optional: under eight suites at once, Node 25 deadlocks in `process.exit()`
when a background Sparkplug or Maglev compile job waits for a GC the exiting main thread never runs —
measured 11 of 240 runs hung without it, 0 of 240 with it, and the flag only works on the command
line (set at runtime through `v8.setFlagsFromString` it changed nothing, and `NODE_OPTIONS` refuses it).

`npm run test:paint` drives real headless Chrome and reads **resolved** computed values; the jsdom
suites resolve no cascade and lay nothing out, so a CSS claim proved only there is not proved.
`test:dialog`, `test:view` and `test:tree` are timing-flaky — re-run alone before blaming a change.

## Commits

**The subject is a few words; everything else is the body.** What used to stand before the dash is
the subject, cut to a few words: `feat(ai): design canvas states`. What stood after the dash goes to
the body: the files and what each does, then `verified:` and what was not verified. Same types and
scopes, same body as before, only the subject is short.

## House rules

- **CRITICAL: NEVER A CHECK MARK INSIDE A BOX OR A CIRCLE.** A chosen, done, viewed or selected state is the bare
  tick only: the kit icon `tick`. The kit's `check` is a tick in a rounded square and is forbidden, as are
  `square-check`, `check-square`, `circle-check` and `check-circle`. Seeing one, the person stops the work.
- **CRITICAL: NO ELLIPSIS IN WRITTEN TEXT.** A label, menu item, button, placeholder or status is written
  without "…" or "...": "Add a provider", never "Add a provider…". Only an overflowing line cut by CSS
  (`text-overflow: ellipsis`) may show one.
- All colours from tokens (`--sumi-*` in the studio, `--wg-kit-*` in the kit); no hardcoded colours. The kit's controls paint fill and corner
  on a `::before` — the element itself is `border-radius: 0` by design.
- Comments only with the prefixes `TODO:` and `TRADE-OFF:`, fewest possible words. `CONTEXT:` is
  gone: a fact the reader needs belongs in a name. A hook blocks anything else, on edits and on
  shell writes alike.
- **Everything written in this repository is English.** Code, strings, comments, commit messages,
  documentation, a `.md` anywhere in the tree. `npm run lint:lang` must pass. Never build a sentence
  by concatenation — author the whole sentence with a placeholder.
- Early returns over nesting; no proxy variables; every new entity needs a consumer.
- **A name says what the code does.** Four rules:
  1. A function that returns a changed copy or builds something is an imperative verb phrase:
     `archiveColumn(column)`, `prune(node)`, `columnsToWrite(columns)` when it only prepares a write.
  2. A past participle or an `is*` name is a fact about data that already exists: `isInstalled`,
     `surfacesWritten(layout)`. A component naming a drawn state (`Collapsed`) is fine.
  3. A hook that performs an effect every render is named for what it does: `useWritesOwnSize`.
  4. One idiom per name: `manifestOfDeclared`, never `manifestOfWritten`.
     Idioms that stay: `xOf(y)` for a derivation read off `y`, `isX`/`hasX`, `refuseX` answering a reason
     or null, `withX(y)`, `useX`, `createX`, `defineX`, `*Schema`. A request, event, subscriber or module is
     its camelCase constant with no kind suffix (`frameSides`, `toggleFrameSide`, `layout`); a module and a plugin
     also take their name as one kebab string (`module("layout")`, `plugin("command-menu")`).
