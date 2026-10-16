# Architecture

The rules every developer and every agent follows when writing code in this repository. Read this page first; the pages below go deeper.

| Page                           | Answers                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| [requests.md](requests.md)     | contracts, guards, handlers, modules, the mediator, idempotency, the server, gateways, data |
| [views.md](views.md)           | blocks, layouts, slots, how a view reads and writes, loading, error and empty               |
| [placement.md](placement.md)   | where each file goes                                                                        |
| [code-style.md](code-style.md) | names, injected keys, the shape of a contract, a handler, a module, a block and a gateway   |
| [hosts.md](hosts.md)           | what a host hands a module, keeping one host's code out of another's bundle, deploy, env    |
| [lint.md](lint.md)             | the checks that hold every rule here                                                        |
| [legacy.md](legacy.md)         | code written before these rules, and how it leaves                                          |

> Status: the canvas (`packages/canvas`) and the engine's request layer (`packages/core/src/requests`) follow these pages; the rest still runs on the earlier widget builder and moves domain by domain. A rule marked **planned** is not built or not checked by a tool yet.

## Three rules

1. **Imports go one way: `apps` → `packages`.** A package never imports an app. A domain uses another domain only through its public entry, `generated/index.ts`.
2. **A file's place is what it is.** A request's contract → `features/<feature>/contract.ts`. Its handler → `handlers.ts` beside it. What is drawn → `ui/`. Data or an outside system → `gateways/`. What a handler needs → the module's `provide`.
3. **Nothing reaches for anything.** A view sends requests through `useQuery` / `useCommand`. A handler declares what it needs in `inject` and receives it as an argument. A host builds the implementations and hands them to `Module.with(parts)`. No hidden globals, no singletons.

## Names

| Declares                      | Written                                                                                    | Named                       | Example                      |
| ----------------------------- | ------------------------------------------------------------------------------------------ | --------------------------- | ---------------------------- |
| a read                        | `query("<module>/<name>")`                                                                 | noun phrase + `Query`       | `PagesQuery`                 |
| a write                       | `command("<module>/<name>")`                                                               | verb phrase + `Command`     | `ShowPageCommand`            |
| its logic                     | `handler(Request, Module).guard(…).use(…).inject({…}).handle(fn)`                          | the request + `Handler`     | `ShowPageCommandHandler`     |
| who may call                  | `guard<In>().inject({…}).handle(check)`                                                    | what it checks + `Guard`    | `OwnsInvoiceGuard`           |
| what wraps a call             | `middleware().inject({…}).handle(fn)`                                                      | what it does + `Middleware` | `TimingLoggerMiddleware`     |
| a domain's wiring             | `serverModule("<name>").guard(…).use(…).provide(fn)`, `clientModule("<name>").provide(fn)` | domain + side + `Module`    | `CanvasClientModule`         |
| a gateway                     | `abstract class`, its own token                                                            | the system + `Gateway`      | `DesignFilesGateway`         |
| its implementation            | `class … extends DesignFilesGateway`                                                       | `<Platform><Name>Gateway`   | `ObsidianDesignFilesGateway` |
| reading and writing in a view | `useQuery`, `useOptionalQuery`, `useCommand`                                               | —                           | —                            |

A module is named `<Domain><Side>Module`; a handler names its module, so its side is visible in the handler file.

Every declared building block is PascalCase and ends with its kind; every declaration is a fluent chain, and every behaviour ends in `.handle()` ([code-style.md](code-style.md#the-fluent-chain)). No `define…` or `create…` prefix: the word itself is the declaration. A query takes no `Get…` prefix. A request's string name is `<module>/<the constant without its suffix, in kebab case>` (`ShowPageCommand` → `canvas/show-page`).

## Two levels

```
apps/        a product you deploy: studio (the app); server (Hono, serves /rpc)
   ↓
packages/    domains (business areas), common code, and the hosts (packages/host-obsidian, …)
```

A host is framework code, not a project's: `packages/host-obsidian` is the Obsidian plugin that runs the apps. A module never asks which host it runs on; the host hands it implementations ([hosts.md](hosts.md)).

## Domains

A domain is a business area: `video`, `billing`; for this repository `canvas`, `assistant`, `catalogue`. Named by its area, never by the product that uses it first.

```
packages/<domain>/
  generated/index.ts           the public entry, written by `widgetarium generate`: every contract, every schema, ui/index.ts
  module.ts                    the one module: runs, handlers, provide; imported only by a starter
  features/<feature>/          contract.ts (requests) + handlers.ts (their handlers); or features/<group>/<feature>/
  gateways/<area>/             <area>.gateway.ts (the abstract class) + one implementation per host
  lib/                         helpers, stores, cached readers used inside the domain
  schema/                      <record>.schema.ts
  ui/                          only .tsx: blocks, layouts, the root view; ui/index.ts names what is public (client modules only)
```

**What it gives:** the path from a click to the data is linear: `useCommand(AddPhotosCommand)` → `features/photos/contract.ts` → `AddPhotosCommandHandler` in `handlers.ts` → its `inject` keys → the module's `provide` → the part the host built.

## Common

Common packages hold code with no domain: the engine (`core`: requests, mediator, hooks, slots), the kit, behaviors (headless, Radix-style), helpers. Common imports no domain.

## Imports

| From ↓ may import → | app | own domain | another domain                           | common |
| ------------------- | --- | ---------- | ---------------------------------------- | ------ |
| app                 | own | —          | its entry; its `module.ts` to start it   | yes    |
| domain              | no  | anything   | its entry, if declared in `package.json` | yes    |
| common              | no  | —          | no                                       | yes    |

A server module's code never reaches a client bundle; nothing in a module imports oRPC or Hono. The graph of domains has no cycle.

## Prior art

| Source                    | Taken                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| MediatR, NestJS CQRS      | a request is sent to a bus; the handler is found by the request                             |
| NestJS guards             | every server request names who may call it; a guard reads the user, never verifies a token  |
| tRPC, oRPC, Convex        | one typed contract shared by client and server; a server request is called like a local one |
| TanStack Query            | the cache under the hooks: dedup, stale time, structural sharing on a re-read               |
| Stripe idempotency keys   | a write runs once per key, keys scoped per account                                          |
| Hono                      | the server: one `fetch` handler mounted anywhere                                            |
| Radix                     | behavior ready-made, the look written by the project                                        |
| Relay, Presentation Model | a block gets data already shaped for what it draws                                          |
| Drizzle                   | tables as code, migrations generated from them (**planned**)                                |

Research behind this page: [a simpler architecture](https://claude.ai/artifact/XkjuHUsXeX65WK4bfzEAiC), [coupling between domains](https://claude.ai/artifact/XbHJNHvW3Fr1xGB1zgUkQV), [CQRS](https://claude.ai/artifact/BTCZLhbBiiRsEP4qAV5b1d), [oRPC](https://claude.ai/artifact/CyifG8Aq9SegsBXvWNM2i7).
