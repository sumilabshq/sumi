# Where a file goes

A file's place is decided by **what it is** and **who uses it**: a feature's own code stays in the feature; what two features use moves to `shared/`. There are two package shapes: a data module and a client package.

## A data module

`packages/domain/<name>/` or `packages/state/<name>/`, `"widgetarium": { "level": "domain" }`. Reference: `packages/state/layout`.

```
index.ts                         generated: export * from "./generated/contract.js"; the "." entry
server.ts                        generated, only for a Server or Anywhere module with non-public requests: export * from "./generated/server.js"; the "./server" entry
module.ts                        module("<name>").on(…).provide(…).handles(...handled); the "./module" entry
package.json                     "exports" (".", "./module", "./server" when generated) and "imports": { "#module": ./generated/command.ts }
features/<feature>/requests.ts   the feature's requests, each with its handler
features/<feature>/lib/          pure functions the feature's handlers share
shared/lib/                      pure functions two features use
shared/schema/<record>.schema.ts zod shapes and their inferred types
gateways/<gateway>/              <gateway>.gateway.ts (the abstract class), one <storage>.gateway.ts per implementation, <gateway>.events.ts for the events it is the source of
shared/events/<topic>.events.ts  emitted events two features use
gateways/<module>-parts/         the picker: which implementation each platform gets (layoutPartsOn)
generated/contract.ts            generated, self-contained: every .public() request and event up to its first handling step, and the module's descriptor
generated/server.ts              generated: the non-public requests, for other server modules
generated/handled.ts             generated: every request with a handler, every event and subscriber; module.ts ends with .handles(...handled)
generated/command.ts             generated: command, query, subscriber, event typed by the module's provide; the "#module" import
```

No `ui/`, no `.tsx`, no React. No empty folder is created ahead. The top holds nothing else but `package.json`, `tsconfig*.json`, `LICENSE`.

## Starting a module or a feature

A data module and a feature are laid by the CLI, never by hand; what it lays is the reference shape.

| Command                                                                            | Lays                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `widgetarium add module <name> --on Server\|Device\|Anywhere [--in domain\|state]` | `packages/<layer>/<name>/` with `package.json` (`"."` and `"./module"`, the latter only under `"server"` for a server module), `tsconfig.json`, `LICENSE`, `module.ts` (a server module guarded by `AuthenticatedGuard`) and the picker `gateways/<name>-parts/`; adds the folder to the workspaces and `test:types`, runs `generate` |
| `widgetarium add feature <module>/<feature> [--query <Name>] [--command <Name>]`   | `features/<feature>/requests.ts`, `shared/schema/<feature>.schema.ts`, `gateways/<feature>/` (the abstract class and `memory.gateway.ts`) wired into the picker, the requests marked `.public()`, `tools/<module>-<feature>-checks.ts` starting the module `({ injects: fakes })`; runs `generate`                                    |

Both refuse an existing folder, feature or package name and a bad name, writing nothing. Run the check the feature got with `node --single-threaded --import ./tools/loader/register.mts tools/<module>-<feature>-checks.ts`.

## A client package

`packages/client/<name>/`, `"widgetarium": { "level": "client" }`. Reference: `packages/client/shell`.

```
index.ts                         generated: export * from "./shared/ui/index.js"; the "." entry
features/<feature>/ui/<block>/   the feature's blocks, .tsx only
features/<feature>/lib/          hooks and helpers the feature's blocks use, .ts
shared/ui/                       blocks two features use, the root views; shared/ui/index.ts names what is public
shared/lib/                      hooks and helpers two features use
```

No `requests.ts`, no `gateways/`, no `module.ts`, no `generated/`. A client package names a data module only as a dependency in `package.json` and imports only its `"."`.

## The layer order

Inside a data module imports point one way, the right one importing the left:

```
shared → gateways → features → module.ts
```

| Layer       | Imports                                             |
| ----------- | --------------------------------------------------- |
| `shared/`   | `shared/` only                                      |
| `gateways/` | `shared/` and `gateways/`                           |
| `features/` | `shared/`, `gateways/` and its own folder           |
| `module.ts` | `gateways/` (the picker) and `generated/handled.ts` |

Nothing imports `module.ts` inside the package except `generated/command.ts`, for its type. `generated/` is written by the generator and stands outside the order: requests import their builders from it through `#module`, and `module.ts` imports `handled` from it. `layer-order` checks the table.

## The entries

| Package     | Entry        | Points at        | Holds                                                   | Imported by                    |
| ----------- | ------------ | ---------------- | ------------------------------------------------------- | ------------------------------ |
| data module | `"."`        | root `index.ts`  | the generated contract: requests and their schemas only | anyone                         |
| data module | `"./server"` | root `server.ts` | the generated non-public requests                       | only another data module       |
| data module | `"./module"` | `module.ts`      | the module with every handler and every gateway         | only the app that starts it    |
| client      | `"."`        | root `index.ts`  | `shared/ui/index.ts`                                    | an app, another client package |

There is no `"./gateways"`: the module picks its gateways from the facts it is given. **`generated/` holds only generated code, never a re-export**: re-exporting `module.ts` from a generated entry would drag every handler and gateway into each client bundle; the generator refuses to write one. Every generated file opens with `// @generated by widgetarium generate. Do not edit`.

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
| a block, a layout, a root view                                  | a client package's `ui/`                                                  |
| a hook or helper a block uses                                   | a client package's `lib/`                                                 |
| behavior with no domain (drag, scroll, focus)                   | `packages/shared/behaviors`                                               |
| a drawn part with no domain                                     | the kit                                                                   |
| a route, a page, the modules an app starts, the facts it passes | `apps/<product>/`                                                         |
| what runs the apps inside another program                       | `apps/host-<name>/`                                                       |

## Questions an agent asks, answered

**Another module needs this request.** Name the module in `.imports(...)`, import the request from its `"."` (or `"./server"` for a non-public one), and call `send(Request, input)` in the handler ([requests.md](requests.md#sending-to-another-module)). Never import the other module's `module.ts`, handler or gateway.

**Two handlers of one feature compute the same thing.** It is a pure function in that feature's `lib/`. Two features → `shared/lib/`. A feature never imports another feature's `lib/`.

**Where does this handler get X?** The module's `provide` returns `x: XGateway`, built from the facts; the handler reads `x` from its second parameter, typed through `#module`. A guard or middleware names it in its own `.inject`.

**A decision in a gateway?** It moves to the handler, or to a pure function in `lib/` the handler calls ([layers.md](layers.md)).

**What does an app import?** The module from `"./module"` to start it, the views from the client package's `"."`: `app().modules(LayoutModule).start({ platform, scope })` and `<AppProvider app={…}><StudioFrame /></AppProvider>`.

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
