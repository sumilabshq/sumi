# Where a file goes

A file's place is decided by **what it is** and **who uses it**: a feature's own code stays in the feature; what two features use moves to `shared/`.

## Inside a module

```
packages/<module>/
  package.json                 name, "widgetarium": { "level": "domain" }, the three entries
  module.ts                    only the serverModule(...) or clientModule(...) definition
  features/<feature>/          contract.ts, handlers.ts, ui/ (the feature's blocks), lib/ (feature-only code)
  features/<group>/<feature>/  a group holds only feature folders; two levels at most
  shared/ui/                   blocks two features use, and the module's root views (composition); ui/index.ts is the public ui
  shared/lib/                  code two features use
  shared/schema/               <record>.schema.ts: zod shapes (and Drizzle tables, when the module has a database)
  adapters/<port>/             <port>.adapter.ts (abstract) and one <platform>.adapter.ts per platform
  adapters/<port>/<platform>/  an implementation with private parts: <platform>.adapter.ts is its one entry
  generated/                   index.ts, module.ts, adapters.ts: written by `widgetarium generate`, never by hand
```

A server module has no `ui/`. No empty folder is created ahead. The top holds nothing else but `package.json`, `tsconfig*.json`, `LICENSE` and a stylesheet.

## The three entries

| Entry          | Points at               | Holds                                                                                                             | Imported by                                                                                                           |
| -------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `"."`          | `generated/index.ts`    | every contract, every `shared/schema`, and `shared/ui/index.ts`                                                   | anyone                                                                                                                |
| `"./module"`   | `generated/module.ts`   | the definition joined with every exported `*Handler`                                                              | a starter: a client app or host for a client module; a server app for a server module (behind the `server` condition) |
| `"./adapters"` | `generated/adapters.ts` | every port, every platform implementation, the parts type and factories (`obsidianCanvasParts`, `webCanvasParts`) | a starter or host; a web build keeps only what it uses (`sideEffects: false`)                                         |

## The table

| The file is…                                      | It goes to                                             |
| ------------------------------------------------- | ------------------------------------------------------ |
| what a view or another module may ask             | `features/<feature>/contract.ts`                       |
| the logic answering it                            | `features/<feature>/handlers.ts`                       |
| a block one feature draws                         | `features/<feature>/ui/`                               |
| code one feature uses                             | `features/<feature>/lib/`                              |
| a block or code two features use, a root view     | `shared/ui/`, `shared/lib/`                            |
| a record's shape                                  | `shared/schema/<record>.schema.ts`                     |
| where the module runs and what its handlers share | `module.ts`                                            |
| an outside system (the vault, a database, Stripe) | `adapters/<port>/`: the port and one file per platform |
| the parts one platform builds                     | `adapters/<module>-parts/<platform>.adapter.ts`        |
| behavior with no domain (drag, scroll, focus)     | `packages/behaviors`                                   |
| a drawn part with no domain                       | the kit                                                |
| a route, a page, the modules an app starts        | `apps/<product>/`                                      |
| what runs the apps inside another program         | `packages/host-<name>/`                                |

## Questions an agent asks, answered

**Another module needs this request.** Its contract is in the `"."` entry already; the other module declares the dependency and sends it. It never imports the handler or the module.

**Two features need the same helper.** It moves to `shared/lib/`. A feature never imports another feature's `ui/` or `lib/`.

**Where does this handler get X?** It names `x: X` in `inject`. The module's `provide` returns it, built from the host's parts.

**A decision about data in an adapter?** It moves to a handler or `lib/`. An adapter holds only the calls to its system.

**What does an app import from a module?** The root view from `"."`, the assembled module from `"./module"`, the parts factory from `"./adapters"`: `app({ modules: [CanvasClientModule.with(webCanvasParts(project, host))] })`.

**One platform's adapter in another's bundle?** Never: the browser studio imports `webCanvasParts` from `"./adapters"`, and tree-shaking leaves every Obsidian implementation out. `npm run test:web-canvas-bundle` proves it from the esbuild metafile.

## File names

| Name                    | Kind                                         |
| ----------------------- | -------------------------------------------- |
| `contract.ts`           | a feature's requests                         |
| `handlers.ts`           | their handlers                               |
| `module.ts`             | the module definition                        |
| `<port>.adapter.ts`     | the abstract class of an outside system      |
| `<platform>.adapter.ts` | one implementation of it (`obsidian`, `web`) |
| `<record>.schema.ts`    | zod shapes                                   |
| `<block>.tsx`           | a block or a part, TSX + Tailwind            |

Files are kebab-case; exports are named.
