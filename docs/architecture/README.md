# Architecture

The rules every developer and every agent follows when writing code in this repository. Read this page first; the pages below go deeper.

| Page                           | Answers                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| [layers.md](layers.md)         | what a handler, a gateway, lib, a schema, a module and a view may do, with bad and good examples |
| [requests.md](requests.md)     | requests, modules, sending, guards, the mediator, idempotency, starting an app and a server      |
| [views.md](views.md)           | client packages, blocks, layouts, slots, how a view reads and writes, loading, error and empty   |
| [placement.md](placement.md)   | where each file goes, the two package shapes and their entries                                   |
| [code-style.md](code-style.md) | names, injected keys, logging, the shape of a request, a module, a block and a gateway           |
| [hosts.md](hosts.md)           | the facts a host hands an app, keeping one platform's code out of another's bundle, deploy, env  |
| [lint.md](lint.md)             | the checks that hold every rule here                                                             |
| [migrate.md](migrate.md)       | converting a package to this architecture, step by step                                          |
| [legacy.md](legacy.md)         | code written before these rules: `legacy/` folders and the older module shape                    |

> Status: `packages/state/layout` (data) and `packages/client/shell` (its views) are the reference pair. Every other package under `packages/domain/` and `packages/client/mascot` still has the older module shape ([legacy.md](legacy.md#the-older-module-shape)) and moves by [migrate.md](migrate.md). A rule marked **planned** is not built or not checked by a tool yet.

## Layers

```
apps/                 a product you deploy or a host: studio, server, host-obsidian, host-tauri
   ↓
packages/client/      views: React blocks reading and writing data modules through requests
   ↓
packages/domain/      data modules of a business area (chats, tabs, billing); may run on a server
packages/state/       data modules of the app's own state (layout); run where the app runs
   ↓
packages/shared/      code with no domain: core (requests, mediator, hooks), kit, behaviors, cli, eslint-plugin
```

`domain` and `state` are the same kind of package, a **data module** (`module(...)`, `"level": "domain"`), with the same rules; the folder only says what the data is about. A client package declares `"level": "client"`; a shared one `"level": "common"`.

## Three rules

1. **Imports go one way: `apps` → `client` → `domain`/`state` → `shared`.** A package never imports an app. A package reaches a data module only through its `"."` entry, the generated contract.
2. **A file's place is what it is.** A request and its handler → `features/<feature>/requests.ts`. What is drawn → a client package. Storage or an outside system → `gateways/`. A pure computation → `lib/`. Which gateway a platform gets → the module's `provide`.
3. **Nothing reaches for anything.** A view sends requests through `useQuery` / `useCommand`. A handler declares what it needs in `.inject` and receives it as an argument. A host hands the app facts (platform, workspace, env), never gateways. No hidden globals, no singletons.

## Names

| Declares                      | Written                                                        | Named                       | Example                  |
| ----------------------------- | -------------------------------------------------------------- | --------------------------- | ------------------------ |
| a read and its handler        | `query("<short-name>").output(…).inject({…}).handle(fn)`       | noun phrase + `Query`       | `FrameSidesQuery`        |
| a write and its handler       | `command("<short-name>").input(…).idempotencyKey(…)….handle()` | verb phrase + `Command`     | `ToggleFrameSideCommand` |
| a data module                 | `module("<name>").queries(…).commands(…).provide(fn)`          | its area + `Module`         | `LayoutModule`           |
| who may call                  | `guard<In>().inject({…}).handle(check)`                        | what it checks + `Guard`    | `OwnsInvoiceGuard`       |
| what wraps a call             | `middleware().inject({…}).handle(fn)`                          | what it does + `Middleware` | `TimingLoggerMiddleware` |
| storage or an outside system  | `abstract class`, its own token                                | its data + `Gateway`        | `FrameSidesGateway`      |
| one storage's implementation  | `class … extends FrameSidesGateway`                            | `<Storage><Name>Gateway`    | `TauriFrameSidesGateway` |
| reading and writing in a view | `useQuery`, `useOptionalQuery`, `useCommand`                   | —                           | —                        |

A request's string name is short: the constant without its suffix, in kebab case (`ToggleFrameSideCommand` → `"toggle-frame-side"`). The module stamps it `<module>/<short>` when it lists it, so the module name is never written twice. Every declaration is a fluent chain and every behaviour ends in `.handle()` ([code-style.md](code-style.md#the-fluent-chain)).

## Imports

| From ↓ may import → | app | client package | data module                                                     | shared |
| ------------------- | --- | -------------- | --------------------------------------------------------------- | ------ |
| app                 | own | its `"."`      | its `"."`; its `"./module"` to start it                         | yes    |
| client package      | no  | its `"."`      | its `"."`                                                       | yes    |
| data module         | no  | no             | its `"."`, declared in `package.json`, to name what it `.sends` | yes    |
| shared              | no  | no             | no                                                              | yes    |

A data module never imports React; a client package never imports `"./module"` or a gateway. The graph of packages has no cycle.

## Prior art

| Source                              | Taken                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| MediatR, NestJS CQRS                | a request is sent to a bus; the handler is found by the request's name                      |
| Elm, Redux, LiveStore, Linear       | state is data, a view is a function of it; UI state lives in the same store as data         |
| Medusa v2                           | a module owns its data; modules meet through ids and requests, never each other's internals |
| TanStack Start, Next `"use server"` | server code is cut by the build, not by discipline                                          |
| tRPC, oRPC, Convex                  | one typed contract shared by client and server; a server request is called like a local one |
| NestJS guards                       | every server request names who may call it; a guard reads the user, never verifies a token  |
| TanStack Query                      | the cache under the hooks: dedup, stale time, structural sharing on a re-read               |
| Stripe idempotency keys             | a write runs once per key, keys scoped per account                                          |
| Spring Modulith, Packwerk           | module boundaries held by a tool                                                            |
| Radix                               | behavior ready-made, the look written by the project                                        |

Research behind this page: [data and views](https://claude.ai/artifact/MYdpuvFAuBnssVzkZ1W4Mt), [a simpler architecture](https://claude.ai/artifact/XkjuHUsXeX65WK4bfzEAiC), [coupling between domains](https://claude.ai/artifact/XbHJNHvW3Fr1xGB1zgUkQV), [CQRS](https://claude.ai/artifact/BTCZLhbBiiRsEP4qAV5b1d), [oRPC](https://claude.ai/artifact/CyifG8Aq9SegsBXvWNM2i7).
