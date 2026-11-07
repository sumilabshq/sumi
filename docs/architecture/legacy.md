# Legacy

Two kinds of code predate these rules. Both leave by rewrite, one package at a time,, with the app running between pieces.

## `legacy/` folders

Code written before any of these rules lives in a `legacy/` folder inside the app or host that runs it: `apps/studio/src/legacy/`. It works as it does today; it is moved there, not changed.

| Rule                                                                              | Why                                                   |
| --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| nothing new is written in `legacy/`; only a mount seam to new code                | the folder only shrinks                               |
| only its own app or host imports it                                               | no package grows a dependency on code that is leaving |
| a piece leaves by being rewritten into a package, then its legacy file is deleted | there is one copy of each thing at any time           |
| a legacy file nothing imports is deleted                                          | dead code is not kept "in case"                       |

## The older module shape

`packages/domain/{app-host,browser,canvas}`, `plugins/chat/data/assistant` and `packages/client/mascot` were written in an earlier shape. Recognise it by:

| Older shape                                                                  | This architecture                                                                   |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `features/<f>/contract.ts` + `handlers.ts`                                   | `features/<f>/requests.ts`                                                          |
| `handler(XCommand, CanvasClientModule).inject(…).handle(…)`                  | `command("x").….handle(…)`, `command` from `#module`                                |
| `clientModule("canvas")` / `serverModule("billing")`, `<Domain><Side>Module` | `module("canvas")`, `<Area>Module`; the app picks the side                          |
| request name `"canvas/add-photos"`                                           | `"add-photos"`, stamped by the module                                               |
| `provide((parts) => …)`, the host builds `webCanvasParts(…)`                 | `provide((facts) => …)`, the module picks its gateways                              |
| `generated/index.ts`, `generated/module.ts`, `generated/gateways.ts`         | root `index.ts` over `generated/contract.ts`; `module.ts` is the `"./module"` entry |
| `"./gateways"` entry                                                         | none                                                                                |
| `ui/` beside the handlers                                                    | a client package                                                                    |
| a `*Store` in `lib/` holding state and rules                                 | a gateway that stores, the rule in the handler, pure `lib`                          |

Nothing new is written in the older shape.
