# Widgetarium

The product is the Tauri desktop studio (`apps/host-tauri`, `apps/studio`). The vault widget system (boards, tiles, the catalogue, `registry/`) is legacy.

## Architecture

The architecture is `docs/architecture/`, loaded here in full. Where this file and those pages disagree, the
pages win, and a change to the architecture changes them in the same commit.

**CRITICAL — one request system, never a second.** Every call between an app, the shell and a module is a
command or query of a module over a transport (`docs/architecture/requests.md`: `RemoteTransport`,
`server().listen(transport)`, `.imports(X.over(transport))`; identity from `Authenticate`, permissions by
guards, tracking by middleware, push by the transport's `changes`). A new boundary (iframe, window, process)
gets a new transport, never a new message vocabulary. A design or diff introducing "services", `ask`/`answer`,
`op: "read" | "write"`, a bridge protocol or an events channel beside requests is refused on sight. It happened
once: `@sumi/contract` got `ask { service, input }` with a `storage` read/write service, five agents built on
it, and all of it had to be redone.

@docs/architecture/README.md

@docs/architecture/layers.md

@docs/architecture/placement.md

@docs/architecture/requests.md

@docs/architecture/code-style.md

@docs/architecture/views.md

@docs/architecture/hosts.md

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
apps/host-tauri          FSL  the desktop host: windows, workspaces; the product
apps/studio              FSL  @widgetarium/studio: the studio drawn around an app
apps/server              FSL  Hono: serves /rpc for modules that run on a server
      ↓
packages/domain/*             business data modules: workspaces, app-host, browser, assistant, canvas (older shape)
packages/state/*              app-state data modules: layout
      ↓
packages/shared/framework FSL @widgetarium/framework: requests, modules, mediator, transports, hooks
packages/shared/core     FSL  the widget engine (legacy)
packages/shared/kit      MIT  everything drawn: TSX, one file per kit item
packages/shared/behaviors     headless behaviors: drag, scroll, the Tauri store client
packages/shared/cli      FSL  the `widgetarium` bin: generate, create, check, catalogue, add
packages/shared/eslint-plugin the framework's lint rules
packages/shared/vite     FSL  @widgetarium/vite: dev and build run the app, --mode studio the studio around it
packages/shared/packs/*  MIT  widget query and command implementations (legacy)
packages/shared/sdk      FSL  what a widget author compiles against (legacy)
registry/                MIT  the widget library (legacy)
```

`packages/` holds only the four layer folders `domain/`, `state/`, `client/` and `shared/`; hosts are apps.

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
`widgetarium system check <id>` (`npm run test:design-systems` checks every one). **The token contract is
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
     or null, `withX(y)`, `useX`, `createX`, `defineX`, `*Query`/`*Command`, `*Schema`.
