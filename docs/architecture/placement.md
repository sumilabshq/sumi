# Where a file goes

A file's place is decided by **what it is** and **who uses it**: a feature's own code stays in the feature; what two features use moves to `shared/`. There are two package shapes: a data module and a client package. A plugin's `src/` has a client package's inside ([plugins.md](plugins.md#layout)).

## A data module

`modules/<name>/`, `"widgetarium": { "level": "domain" }`. Reference: the `layout` module.

```
server.ts                        generated, only for a Server or Anywhere module with non-public requests: export * from "./generated/server.js"; the "./server" entry
module.ts                        export const <name> = module().on(…).provide(…): the module's decisions only
package.json                     "name", "version", "peerDependencies" (the modules it sends to), "exports" ("./contract", "./implementation", "./server" when generated) and "imports": { "#module": ./generated/command.ts }
features/<feature>/requests.ts   the feature's requests, each with its handler
features/<feature>/lib/          pure functions the feature's handlers share
shared/lib/                      pure functions two features use
shared/schema/<record>.schema.ts zod shapes and their inferred types
gateways/<gateway>/              <gateway>.gateway.ts (the abstract class), one <storage>.gateway.ts per implementation, <gateway>.events.ts for the events it is the source of
shared/events/<topic>.events.ts  emitted events two features use
gateways/<module>-parts/         the picker: which implementation each platform gets (layoutPartsOn)
generated/contract.ts            generated, self-contained: one object named like the module, its descriptor and its namespace of every .public() request and event up to its first handling step; the "./contract" entry
generated/server.ts              generated: the same namespace of the non-public requests, for other server modules
generated/module.ts              generated: the runnable module, handledModule(definition, [...]): every request with a handler and every event named by its path, every subscriber, and the types module.ts re-exports; the "./implementation" entry
generated/command.ts             generated: command, query, subscriber, event typed by the module's provide; the "#module" import
```

No `ui/`, no `.tsx`, no React. No empty folder is created ahead. The top holds nothing else but `package.json`, `tsconfig*.json`, `LICENSE`.

## Starting a module or a feature

A data module and a feature are laid by the CLI, never by hand; what it lays is the reference shape.

| Command                                                                             | Lays                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-framework add module <name> --on Server\|Device\|Anywhere`                    | `modules/<name>/` with `package.json` (`"./contract"` and `"./implementation"`, the latter only under `"server"` for a server module), `tsconfig.json`, `LICENSE`, `module.ts` (`module()`, a server module guarded by `AuthenticatedGuard`) and the picker `gateways/<name>-parts/`; adds the folder to the workspaces and `test:types`, runs `generate` |
| `data-framework add feature <module>/<feature> [--query <name>] [--command <name>]` | `features/<feature>/requests.ts`, `shared/schema/<feature>.schema.ts`, `gateways/<feature>/` (the abstract class and `memory.gateway.ts`) wired into the picker, the requests marked `.public()`, `tools/<module>-<feature>-checks.ts` starting the module `({ injects: fakes })`; runs `generate`                                                        |

Both refuse an existing folder, feature or package name and a bad name, writing nothing; a request name is camelCase letters with no kind suffix (`--query tasks --command addTask`). Run the check the feature got with `node --single-threaded --import ./tools/loader/register.mts tools/<module>-<feature>-checks.ts`.

## A client package

`packages/client/<name>/`, `"widgetarium": { "level": "client" }`. Reference: `packages/client/shell`.

```
index.ts                         generated: export * from "./shared/ui/index.js"; the "." entry
features/<feature>/ui/<block>/   the feature's blocks, .tsx only
features/<feature>/lib/          hooks and helpers the feature's blocks use, .ts
shared/ui/                       blocks two features use, the root views; shared/ui/index.ts names what is public
shared/lib/                      hooks and helpers two features use
```

No `requests.ts`, no `gateways/`, no `module.ts`, no `generated/`. A client package names a data module only as a dependency in `package.json` and imports only its `"./contract"`.

## The layer order

Inside a data module imports point one way, the right one importing the left:

```
shared → gateways → features → module.ts
```

| Layer       | Imports                                           |
| ----------- | ------------------------------------------------- |
| `shared/`   | `shared/` only                                    |
| `gateways/` | `shared/` and `gateways/`                         |
| `features/` | `shared/`, `gateways/` and its own folder         |
| `module.ts` | `gateways/` (the picker) and `features/` (guards) |

Nothing imports `module.ts` inside the package except `generated/command.ts`, for its type, and `generated/module.ts`, which hands it its requests. `generated/` is written by the generator and stands outside the order: requests import their builders from it through `#module`. `layer-order` checks the table.

## The entries

| Package     | Entry                | Points at               | Holds                                                   | Imported by                    |
| ----------- | -------------------- | ----------------------- | ------------------------------------------------------- | ------------------------------ |
| data module | `"./contract"`       | `generated/contract.ts` | the generated contract: requests and their schemas only | anyone                         |
| data module | `"./server"`         | root `server.ts`        | the generated non-public requests                       | only another data module       |
| data module | `"./implementation"` | `generated/module.ts`   | the module with every handler and every gateway         | only the app that starts it    |
| client      | `"."`                | root `index.ts`         | `shared/ui/index.ts`                                    | an app, another client package |

There is no `"./gateways"`: the module picks its gateways from the facts it is given. **`generated/` holds only generated code, never a re-export**, except `generated/module.ts` passing on the types `module.ts` re-exports: a re-export from a contract entry would drag every handler and gateway into each client bundle; the generator refuses to write one. Every generated file opens with `// @generated by data-framework generate. Do not edit`.

## The table

| The file is…                                                    | It goes to                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| a request a view or another module may send, with its handler   | `features/<feature>/requests.ts`                                          |
| a pure computation one feature's handlers share                 | `features/<feature>/lib/`                                                 |
| a pure computation two features use                             | `shared/lib/`                                                             |
| a record's shape                                                | `shared/schema/<record>.schema.ts`                                        |
| a storage-only shape (what is kept on disk, its check)          | beside its gateway (`KeptPaneTreeSchema` in `gateways/pane-tree/`)        |
| storage or an outside system (memory, a file, Tauri, Stripe)    | `gateways/<gateway>/`: the abstract class and one file per implementation |
| which implementation a platform gets                            | `gateways/<module>-parts/`                                                |
| a module's placement, guards and `provide`                      | `module.ts`                                                               |
| a business area's logic and data                                | `modules/<name>/`                                                         |
| a view drawn in the window, and the slots it marks              | `plugins/<name>/`                                                         |
| a block, a layout, a root view                                  | a client package's `ui/`, a plugin's `features/` and `shared/`            |
| a hook or helper a block uses                                   | a client package's `lib/`                                                 |
| behavior with no domain (drag, scroll, focus)                   | `packages/shared/behaviors`                                               |
| a drawn part with no domain                                     | the kit                                                                   |
| a route, a page, the modules an app starts, the facts it passes | `apps/<product>/`                                                         |
| what runs the apps inside another program                       | `apps/host-<name>/`                                                       |

## Questions an agent asks, answered

**Another module needs this request.** List the module in `peerDependencies`, import the request from its `"./contract"` (or `"./server"` for a non-public one), and call `send(billing.charges.charge, input)` in the handler, through the module's namespace ([requests.md](requests.md#sending-to-another-module)). Never import the other module's `module.ts`, handler or gateway.

**Two handlers of one feature compute the same thing.** It is a pure function in that feature's `lib/`. Two features → `shared/lib/`. A feature never imports another feature's `lib/`.

**Where does this handler get X?** The module's `provide` returns `x: XGateway`, built from the facts; the handler reads `x` from its second parameter, typed through `#module`. A guard or middleware names it in its own `.requires`.

**A decision in a gateway?** It moves to the handler, or to a pure function in `lib/` the handler calls ([layers.md](layers.md)).

**What does an app import?** The module from `"./implementation"` to start it, the views from the client package's `"."`: `runtime().modules(layout).start({ platform, scope })` and `<RuntimeProvider runtime={…}><StudioFrame /></RuntimeProvider>`.

**One platform's gateway in another's bundle?** Today the picker imports every implementation, so a browser bundle carries Tauri's gateway code (a `TRADE-OFF:` in `tauri.gateway.ts`, guarded at run time). **planned**: a build-time platform condition.

## File names

| Name                   | Kind                                                                            |
| ---------------------- | ------------------------------------------------------------------------------- |
| `requests.ts`          | a feature's requests and their handlers                                         |
| `module.ts`            | the module definition                                                           |
| `<gateway>.gateway.ts` | the abstract class of a gateway                                                 |
| `<storage>.gateway.ts` | one implementation of it (`tauri`, `web`, `px-memory`, `json-memory`, `server`) |
| `<record>.schema.ts`   | zod shapes                                                                      |
| `<block>.tsx`          | a block or a part, TSX + Tailwind                                               |

Files are kebab-case; exports are named.
