# Legacy

Three kinds of code predate these rules. All leave by rewrite, one package at a time, with the app running between pieces.

## `legacy/` folders

Code written before any of these rules lives in a `legacy/` folder inside the app or host that runs it: `apps/studio/src/legacy/`. It works as it does today; it is moved there, not changed.

| Rule                                                                              | Why                                                   |
| --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| nothing new is written in `legacy/`; only a mount seam to new code                | the folder only shrinks                               |
| only its own app or host imports it                                               | no package grows a dependency on code that is leaving |
| a piece leaves by being rewritten into a package, then its legacy file is deleted | there is one copy of each thing at any time           |
| a legacy file nothing imports is deleted                                          | dead code is not kept "in case"                       |

## The older module shape

`plugins/tabs/navigation/data/app-host`, `packages/domain/{browser,canvas}`, `plugins/ai/agent/data/assistant` and `packages/client/mascot` were written in an earlier shape. Recognise it by:

| Older shape                                                                  | This architecture                                                                        |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `features/<f>/contract.ts` + `handlers.ts`                                   | `features/<f>/requests.ts`                                                               |
| `handler(XCommand, CanvasClientModule).inject(…).handle(…)`                  | `export const x = command().….handle(…)`, `command` from `#module`                       |
| `clientModule("canvas")` / `serverModule("billing")`, `<Domain><Side>Module` | `export const canvas = module("canvas")`; the app picks the side                         |
| request name `"canvas/add-photos"`                                           | no string: `canvas.photos.add`, from the constant, its feature and the module            |
| `provide((parts) => …)`, the host builds `webCanvasParts(…)`                 | `provide((facts) => …)`, the module picks its gateways                                   |
| `generated/index.ts`, `generated/gateways.ts`, a hand-written handler list   | `"./contract"` is `generated/contract.ts`; `"./implementation"` is `generated/module.ts` |
| `"./gateways"` entry                                                         | none                                                                                     |
| `ui/` beside the handlers                                                    | a client package                                                                         |
| a `*Store` in `lib/` holding state and rules                                 | a gateway that stores, the rule in the handler, pure `lib`                               |

Nothing new is written in the older shape.

## The older plugin shape

A package not moved to the model in [plugins.md](plugins.md) still has it. This section leaves when the last package moves.

| Older shape                                                          | This architecture                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------- |
| `plugins/<name>/data/<module>/`, `packages/domain`, `packages/state` | `modules/<name>/`                                              |
| `.require(apps, chat)` on imported objects                           | `peerDependencies`; `app.use("@sumi/chat-plugin")` where used  |
| a module's `.imports(users)` by object                               | `peerDependencies`; a handler sends through the contract       |
| `app.use(backend).moduleOf(…, contract)` starts the module           | the host starts it from `peerDependencies`                     |
| a plugin imports `"./implementation"`                                | only the host does                                             |
| a view imports the contract's value                                  | `useModule("@sumi/tasks")`                                     |
| two plugins of one id run under an alias `chat-2`                    | one package per name; a replacement says so in `replaces`      |
| a module prefix on the wire, `chat-2.questions.agent.post`           | none: one module per name                                      |
| `plugin("tasks")`, `module("tasks")`                                 | `plugin()`, `module()`: the name is read from `package.json`   |
| wire names `tasks.tasks.create`, `chat.composer-model`               | `@sumi/tasks#tasks.create`, `@sumi/chat-plugin#composer-model` |
