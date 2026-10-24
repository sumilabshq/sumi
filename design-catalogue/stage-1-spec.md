# Stage 1: a design system before the build

`SPEC` · 2026-10-10

## TL;DR

Today the agent builds every app in the same look, because the brief says "the look is always the kit's" and the kit is not its to change. Stage 1 adds a step where the app's design system is chosen from `design-catalogue/` before any page is designed, and gives the agent the right to change the app's kit and every other file of the app to match it.

## What stands in the way today (read 2026-10-10)

| Where                             | What it says or does                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/ai/brief.md:64`             | "the look is always the kit's and copy is rewritten"                                                                                 |
| `docs/ai/brief.md:173–176`, law 9 | widgets take parts "from `widgetarium/kit`"; hand-drawn markup only where the kit has no part                                        |
| `docs/ai/brief.md:37`             | the project already holds the kit copied in, `src/shared/kit` — but nothing tells the agent it may change it                         |
| `docs/ai/design-system.md`        | one vault-wide style ("Quiet and strict"), laid once by `layDesignSystemOnce` (`apps/host-obsidian/src/legacy/ai/agent-files.ts:55`) |
| stages in `brief.md`              | 1 spec → 2 domain → 3 design → 4 data → 5 pages; no step chooses a look                                                              |

## Changes

### 1. The catalogue reaches the agent

- `layAgentFiles` lays `design-catalogue/` (README, `patterns/`) and `design-systems/` (`*/DESIGN.md`, `*/USAGE.md`, `*/manifest.json`, `*/tokens.css`, `*/references/` without `more/`) into the vault's handbook folder, read-only, with the `.laid-by-plugin` mark the other laid files use.
- The tool gets `node {tool} systems [--centre …] [--activity …] [--density …]`: lists systems ranked by matched `manifest.json` `fit` parameters, each with its `description`.

### 2. A new stage, "Design system", after the spec

Stages become: 1 spec → **2 design system** → 3 domain → 4 design → 5 data → 6 pages.

1. From the spec, the agent fills the app's fit (centre, activity, density, tone, device).
2. `systems` ranks the catalogue; the agent reads the top entries in full and proposes **up to three** to the person, each as one line: the idea, why it fits this app, and its first reference picture.
3. The person picks one, or asks for another round. **This is the second place the agent waits**, after the spec.
4. The agent writes the app's own system to `docs/design-system.md`: the chosen `DESIGN.md` adapted to the app — the tint chosen by its colour algorithm, the imagery kinds of this domain, light and dark. The chosen system's reference pictures are copied to `docs/references/design/`.
5. The agent changes the app's kit (`src/shared/kit`) to that system: tokens first, then each component whose look the system defines. Behaviour stays.

_Over when `docs/design-system.md` exists, the person picked it, and the kit's tokens match it._

### 3. The agent may change any file of the app

- `brief.md:64` becomes: "Structure and behaviour are taken from references; **the look is the app's design system**."
- Law 9 becomes: "A widget is built from **the app's kit** (`src/shared/kit`), which follows `docs/design-system.md`. Change the kit when the system asks for a part it lacks or draws it differently; never style a widget around the kit."
- The brief states the grant in one line: the agent may edit every file of the app — kit, layouts, widgets, schemas, logic — and nothing outside the app.

### 4. The vault-wide style goes

- `docs/ai/design-system.md` keeps only the layout and composition laws (SH, P, S, R, C); the style line and every look rule are deleted. The look comes only from the app's `docs/design-system.md`.
- `rules <app>` reads the app's file first, as it already does by id.

## Out of scope (stage 2)

- **Vault widgets still draw with the plugin's kit**, not the app's copy (a TODO in CLAUDE.md "In Obsidian"). Until that closes, kit changes reach project apps (`widgetarium/app`, Vite) but not widgets drawn inside Obsidian.
- Merging several systems into a new one.
- A design book per system.

## Checks

| Check                    | How                                                                                                                          | Falsified by                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| The catalogue is laid    | `test:agent-files` lists the laid catalogue files                                                                            | removing one from the lay list |
| `systems` ranks          | a test with three briefs pins the order                                                                                      | swapping one fit value         |
| The old sentence is gone | a test reads `brief.md` and fails on "the look is always the kit's"                                                          | restoring the sentence         |
| The stage exists         | `brief.md` names six stages; the stage ends in a wait                                                                        | deleting the wait line         |
| Grants                   | `brief.md` holds the edit-every-file line                                                                                    | deleting it                    |
| End to end               | a fixture app runs stage 2: a picked system lands in `docs/design-system.md`, a kit token changes, the person was asked once | skipping the question          |

## Open questions

1. Up to three proposals, or one plus "show more"?
2. Should the agent change the kit itself in stage 2, or as a separate job per component (faster in parallel, as measured on 2026-10-10 the full product took 16–28 minutes in one agent)?
