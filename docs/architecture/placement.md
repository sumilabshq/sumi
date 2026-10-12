# Where a file goes

A file's place is decided by **what it is**, never by how many places use it. Nothing moves when a second user appears.

## Inside a domain

```
packages/<domain>/
  index.ts                              re-exports only: the module and the one root view an app draws
  package.json                          name, level, the domains it uses
  <domain>.module.ts                    handlers, provide, use
  requests/<feature>/<name>.ts          one request + its handler
  ui/<name>/<name>.tsx                  everything drawn: a block (+ its parts beside it), a layout, the root view
  ports/<system>.port.ts                an interface for an outside system
  ports/<system>-<adapter>.ts           its adapters, beside it
  schema/<record>.ts                    a Drizzle table + the zod shapes derived from it
```

## The table

| The file is…                                               | It goes to                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| a read or a write, with its rule                           | `requests/<feature>/<name>.ts`                                                          |
| work that runs alone (sync, a timer, a reconciliation job) | `requests/<feature>/<name>.ts` as a service registered in the module                    |
| what is drawn and reads data                               | `ui/<block>/`                                                                           |
| where blocks stand                                         | `ui/<layout>/`: a layout is a block that places slots and reads nothing                 |
| the screen an app draws                                    | `ui/<domain>/`, exported with the module (`Canvas` beside `canvasModule`)               |
| which implementation runs, middleware                      | `<domain>.module.ts`                                                                    |
| an outside system (database, Stripe, Twilio, the vault)    | `ports/`, interface and adapters side by side (a common package when no domain owns it) |
| a table                                                    | `schema/`                                                                               |
| behavior with no domain (drag, scroll, focus)              | `packages/behaviors`                                                                    |
| a drawn part with no domain                                | the kit                                                                                 |
| a route, a page, the modules an app uses                   | `apps/<product>/`                                                                       |

## Questions an agent asks, answered

**Another domain needs this request.** Export it from the domain's `index.ts`; the other domain declares the dependency and sends it.

**Where does this view get its data?** From `useQuery` / `useCommand` in the block itself. Go to the request's definition; its handler is in the same file.

**Where does this handler get X?** Its constructor. X is provided by the module (`provide`), one line per implementation.

**A decision about data in a block?** It moves into the query's answer or into the command's handler.

**A decision about data in an adapter?** It moves to `requests/` too. An adapter holds only the calls to its system (read a file, write a file, take a picture); which widgets a spec names, how a drawn state is chosen, which note to return to are canvas rules.

**What does an app import from a domain?** The module and its root view: `app({ modules: [canvasModule], host })` and `<Canvas />`. A block the app does not draw on its own is not exported.

**One platform's adapter in another platform's bundle?** No subpath per platform. Each host's build defines `__WG_PLATFORM__` (esbuild or Vite `define`), the module branches on it in `provide`, and the bundler drops the branch it does not take, adapter included. `npm run test:web-canvas-bundle` proves it for the canvas from the esbuild metafile.

## File names

| Name                       | Kind                                              |
| -------------------------- | ------------------------------------------------- |
| `<name>.ts` in `requests/` | a request constant (PascalCase) + `<Name>Handler` |
| `<domain>.module.ts`       | the module                                        |
| `<system>.port.ts`         | a port; adapters `<system>-<adapter>.ts`          |
| `<block>.tsx`              | a block or a part, TSX + Tailwind                 |

Files are kebab-case; exports are named.
