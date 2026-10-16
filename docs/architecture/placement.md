# Where a file goes

A file's place is decided by **what it is**, never by how many places use it. Nothing moves when a second user appears.

## Inside a domain

```
packages/<domain>/
  index.ts                                   re-exports only: the module, the root view, the requests other domains send
  package.json                               name, level, the domains it uses
  <domain>.module.ts                         the one module: handlers, provide, imports, exports, use
  requests/<name>.query.ts                   a query's contract: name, schemas, .onServer()
  requests/<name>.command.ts                 a command's contract: name, schemas, idempotencyKey, .onServer()
  client/<feature>/<name>.handler.ts         class <Request>Handler extends handlerOf(<Request>), runs in an app
  server/<feature>/<name>.handler.ts         a handler that runs on the server, and its server-only adapters
  ui/<block>/<name>.tsx                      only .tsx: a block and its parts, a layout, the root view
  adapters/<what>/<what>.adapter.ts          the abstract class an outside system is reached through
  adapters/<what>/<platform>.adapter.ts      its implementation for one platform: obsidian.adapter.ts, web.adapter.ts
  adapters/<what>/<platform>/<platform>.adapter.ts   an implementation with private parts, its parts beside it
  lib/<feature>/<name>.ts                    everything else used inside the domain: helpers, stores, internal services, hooks
  schema/<record>.schema.ts                  zod shapes (and Drizzle tables, when the domain has a database)
```

`server/` exists only once the domain has a server request; no empty folder is created ahead.

## The table

| The file is…                                                     | It goes to                                                                       |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| what a view or another domain may ask                            | `requests/<name>.query.ts` or `.command.ts`                                      |
| the logic answering it in an app                                 | `client/<feature>/<name>.handler.ts`                                             |
| the logic answering a `.onServer()` request                      | `server/<feature>/<name>.handler.ts`                                             |
| what is drawn and reads data                                     | `ui/<block>/`                                                                    |
| where blocks stand                                               | `ui/<layout>/`: a layout places slots and reads nothing                          |
| the screen an app draws                                          | `ui/<domain>/`, exported with the module (`Canvas` beside `canvasModule`)        |
| which implementation runs on which platform, middleware          | `<domain>.module.ts`                                                             |
| an outside system (the vault, a database, Stripe)                | `adapters/<what>/`: the abstract class and one implementation per platform       |
| an implementation not tied to a platform (a project's routes)    | `adapters/<what>/<kind>.adapter.ts` (`project.adapter.ts`), chosen in the record |
| a pure helper, a store, an internal service, a hook a block uses | `lib/<feature>/`                                                                 |
| a schema                                                         | `schema/<record>.schema.ts`                                                      |
| behavior with no domain (drag, scroll, focus)                    | `packages/behaviors`                                                             |
| a drawn part with no domain                                      | the kit                                                                          |
| a route, a page, the modules an app uses                         | `apps/<product>/`                                                                |
| what runs the apps on a platform                                 | `packages/host-<platform>/`                                                      |

## Questions an agent asks, answered

**Another domain needs this request.** Export its contract from the domain's `index.ts`; the other domain declares the dependency and sends it.

**Another module needs this dependency.** Add it to `exports` here and this module to that module's `imports`. `app()` refuses an injection across modules that skips either.

**Where does this view get its data?** From `useQuery` / `useCommand` in the block itself. The contract is in `requests/`, its handler in `client/` under the feature's name.

**Where does this handler get X?** `this.inject(X)` in a field. X is provided by the module, one factory per platform.

**A decision about data in a block?** It moves into the query's answer or into the command's handler.

**A decision about data in an adapter?** It moves to `lib/` or a handler. An adapter holds only the calls to its system (read a file, write a file, take a picture).

**What does an app import from a domain?** The module and its root view: `app({ modules: [canvasModule], platforms, host })` and `<Canvas />`.

**One platform's adapter in another platform's bundle?** Never, in a build from source. Each such build resolves `adapters/<what>/<platform>.adapter.ts` of another platform, and `server/` outside a server build, to a stand-in that throws, so the web bundle carries no Obsidian code; a packed package still carries every platform's adapters ([hosts.md](hosts.md#one-build-per-platform)). `npm run test:web-canvas-bundle` proves it from the esbuild metafile.

## File names

| Name                             | Kind                                          |
| -------------------------------- | --------------------------------------------- |
| `<name>.query.ts`, `.command.ts` | a request contract, in `requests/`            |
| `<name>.handler.ts`              | `<Request>Handler`, in `client/` or `server/` |
| `<domain>.module.ts`             | the module                                    |
| `<what>.adapter.ts`              | the abstract class of an outside system       |
| `<platform>.adapter.ts`          | its implementation for one platform           |
| `<record>.schema.ts`             | zod shapes                                    |
| `<block>.tsx`                    | a block or a part, TSX + Tailwind             |

Files are kebab-case; exports are named.
