# Where a file goes

A file's place is decided by **what it is**, never by how many places use it. Nothing moves when a second user appears.

## Inside a domain

```
packages/<domain>/
  package.json                                 name, level ("widgetarium": { "level": "domain" }), the domains it uses
  index.ts                                     the public entry: contracts, schema types, the root view (TODO: generated)
  module.ts                                    the one module: runs, handlers, provide; parts for a host-free implementation
  vault.ts                                     the parts an Obsidian host builds (vaultCanvasParts)
  features/<feature>/contract.ts               its requests: name, guards, schemas, policies
  features/<feature>/handlers.ts               their handlers: handler(Request, { inject, run, watch? })
  adapters/<area>/<area>.adapter.ts            the abstract class an outside system is reached through
  adapters/<area>/<kind>.adapter.ts            one implementation: vault.adapter.ts, project.adapter.ts, assistant.adapter.ts
  adapters/<area>/<kind>/<kind>.adapter.ts     an implementation with private parts, its parts beside it
  lib/<feature>/<name>.ts                      helpers, stores, cached readers, hooks a block uses
  schema/<record>.schema.ts                    zod shapes (and Drizzle tables, when the domain has a database)
  ui/<block>/<name>.tsx                        only .tsx: a block and its parts, a layout, the root view; client modules only
```

A server module (`runs: "server"`) has no `ui/`. No empty folder is created ahead.

## The table

| The file is…                                                 | It goes to                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| what a view or another domain may ask                        | `features/<feature>/contract.ts`                                       |
| the logic answering it                                       | `features/<feature>/handlers.ts`                                       |
| what is drawn and reads data                                 | `ui/<block>/`                                                          |
| where blocks stand                                           | `ui/<layout>/`: a layout places slots and reads nothing                |
| the screen an app draws                                      | `ui/<domain>/`, exported from `index.ts` (`Canvas`)                    |
| which handlers run, what they are given                      | `module.ts`                                                            |
| an outside system (the vault, a database, Stripe)            | `adapters/<area>/`: the abstract class and one implementation per host |
| the parts one host builds                                    | `module.ts` for a host-free one, `vault.ts` for Obsidian               |
| a pure helper, a store, a cached reader, a hook a block uses | `lib/<feature>/`                                                       |
| a schema                                                     | `schema/<record>.schema.ts`                                            |
| behavior with no domain (drag, scroll, focus)                | `packages/behaviors`                                                   |
| a drawn part with no domain                                  | the kit                                                                |
| a route, a page, the modules an app starts                   | `apps/<product>/`                                                      |
| what runs the apps inside another program                    | `packages/host-<name>/`                                                |

## Questions an agent asks, answered

**Another domain needs this request.** Export its contract from the domain's `index.ts`; the other domain declares the dependency and sends it. It never imports the handler or the module.

**Where does this view get its data?** From `useQuery` / `useCommand` in the block itself. The contract is in `features/<feature>/contract.ts`, its handler in `handlers.ts` beside it.

**Where does this handler get X?** It names `x: X` in `inject`. The module's `provide` returns it, built from the host's parts.

**A decision about data in a block?** It moves into the query's answer or into the command's handler.

**A decision about data in an adapter?** It moves to a handler or `lib/`. An adapter holds only the calls to its system.

**What does an app import from a domain?** The root view from `index.ts`, and `module.ts` (or `vault.ts`) to start it: `app({ modules: [canvasModule.with(parts)] })` and `<Canvas />`.

**One host's adapter in another host's bundle?** Never: the browser studio imports `module.ts` and never `vault.ts`, so no vault implementation is reached. `npm run test:web-canvas-bundle` proves it from the esbuild metafile.

## File names

| Name                 | Kind                                    |
| -------------------- | --------------------------------------- |
| `contract.ts`        | a feature's requests                    |
| `handlers.ts`        | their handlers                          |
| `module.ts`          | the module                              |
| `<area>.adapter.ts`  | the abstract class of an outside system |
| `<kind>.adapter.ts`  | one implementation of it                |
| `<record>.schema.ts` | zod shapes                              |
| `<block>.tsx`        | a block or a part, TSX + Tailwind       |

Files are kebab-case; exports are named.
