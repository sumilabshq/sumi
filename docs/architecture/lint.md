# Lint

Every rule in these pages is a folder, a file name or a type. So every rule is checked by a tool, not by review. All are **planned**; a rule is switched on only after a count shows which files it would refuse.

Every package carries its level in `package.json`:

```json
{ "widgetarium": { "level": "host" | "app" | "domain" | "common" } }
```

| Rule            | Refuses                                                                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| levels          | an import against the table in [README.md](README.md#imports)                                                                                                                                                                                                    |
| public API      | an import of another package by any path but its `index.ts`                                                                                                                                                                                                      |
| declared        | an import of a domain not listed in `package.json` dependencies                                                                                                                                                                                                  |
| no cycles       | a cycle in the graph of domains                                                                                                                                                                                                                                  |
| inside a domain | `ui/` or `widgets/` importing `logic/`; `logic/` importing `ui/` or `widgets/`; a view importing a widget; JSX in a `.widget.ts`                                                                                                                                 |
| index files     | anything in an `index.ts` but re-exports; a re-export from `ui/`                                                                                                                                                                                                 |
| placement       | `.query.ts`, `.command.ts`, `.service.ts` outside `logic/`; `.schema.ts` outside `schemas/`; JSX outside `ui/`, the kit, apps and hosts; `.widget.ts` outside `widgets/`; a widget declaring metadata or layout                                                  |
| size            | a file over 200 lines; an inject with more than 12 entries (warning); a view whose props type is not `InjectProps` of its widget; `.inject({ … })` with an inline object instead of an `inject()` constant (warning; the agent's `widgets.mjs check` refuses it) |
| hooks           | a `use*` in `logic/`; a widget hook that calls a port                                                                                                                                                                                                            |
| schemas         | `z.object` in a widget, or in a handler except as its own input                                                                                                                                                                                                  |
| server          | `secrets` outside a `.server()` handler; a server-only source reached from a browser bundle                                                                                                                                                                      |
| legacy          | a new file in a `legacy/` folder; an import of `legacy/` from anything but its own app or host                                                                                                                                                                   |

Tools: `eslint-plugin-boundaries` for the import rules, a small check under `tools/` for placement, size and legacy, the type system for `secrets`.

Each check is proven by breaking it on purpose: write the file it must refuse, see it red, remove the file.

A rule's message says what to do, not only what is wrong. The inject limit, for example:

> `canvas-field` injects 20 entries; more than 12 usually means one widget draws several things. Split it into small widgets that each answer one question, and compose them in a layout widget the app places.
