# Architecture

The rules every developer and every agent follows when writing code in this repository. Read this page first; the pages below go deeper.

| Page                           | Answers                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| [requests.md](requests.md)     | requests and handlers, the mediator, modules, platforms, idempotency, data, the server |
| [views.md](views.md)           | blocks, layouts, slots, how a view reads and writes, loading, error and empty          |
| [placement.md](placement.md)   | where each file goes                                                                   |
| [code-style.md](code-style.md) | names, injected fields, the shape of a handler, a block and an adapter                 |
| [hosts.md](hosts.md)           | platforms and their hosts, platform builds, deploy, secrets                            |
| [lint.md](lint.md)             | the checks that hold every rule here                                                   |
| [legacy.md](legacy.md)         | code written before these rules, and how it leaves                                     |

> Status: the canvas (`packages/canvas`) and the engine (`packages/core/src/mediator`) follow these pages; the rest still runs on the earlier widget builder and moves domain by domain. A rule marked **planned** is not checked by a tool yet.

## Three rules

1. **Imports go one way: `apps` → `packages`.** A package never imports an app. A domain uses another domain only through its `index.ts`.
2. **A file's place is what it is.** A request's contract → `requests/`. Its handler → `client/<feature>/` or `server/<feature>/`. What is drawn → `ui/`. An outside system → `adapters/`. Which implementation runs → the domain's one module.
3. **Nothing reaches for anything.** A view sends requests through the mediator. A handler gets its dependencies with `this.inject(X)` and sends with `this.send(Request, input)`. The platform is given by the framework: a typed host per platform and the build constant `__WG_PLATFORM__`. No hidden globals, no singletons.

## Names

| Declares                      | Written                                                | Named                   | Example                  |
| ----------------------------- | ------------------------------------------------------ | ----------------------- | ------------------------ |
| a read                        | `query("<module>/<name>")`                             | noun phrase + `Query`   | `PagesQuery`             |
| a write                       | `command("<module>/<name>")`                           | verb phrase + `Command` | `ShowPageCommand`        |
| its logic                     | `class … extends handlerOf(X)`                         | `<Request>Handler`      | `ShowPageCommandHandler` |
| a domain's wiring             | `module({ handlers, provide, imports, exports, use })` | `<domain>Module`        | `canvasModule`           |
| an outside system             | `abstract class` (its own token)                       | the system              | `DesignSource`           |
| its implementation            | `class … extends DesignSource`                         | `<Platform><System>`    | `ObsidianDesignSource`   |
| reading and writing in a view | `useQuery`, `useOptionalQuery`, `useCommand`           | —                       | —                        |

No `define…` or `create…` prefix on these: the word itself is the declaration. A query takes no `Get…` prefix: the suffix already says it reads. A request's string name is `<module>/<the constant without its suffix, in kebab case>` (`ShowPageCommand` → `canvas/show-page`, `PagesQuery` → `canvas/pages`).

## Two levels

```
apps/        a product you deploy: studio (the app), server (the backend, created with the first server request)
   ↓
packages/    domains (business areas), common code, and the hosts (packages/host-obsidian, …)
```

A host is framework code, not a project's: `packages/host-obsidian` is the Obsidian plugin that runs the apps. A module never asks which host it runs on; it names one factory per platform and receives that platform's typed host ([hosts.md](hosts.md)).

## Domains

A domain is a business area: `video`, `billing`; for this repository `canvas`, `assistant`, `catalogue`. Named by its area, never by the product that uses it first.

```
packages/<domain>/
  index.ts                  the public API: the module, its root view, the requests other domains send
  <domain>.module.ts        the one module: handlers, provide (a record per platform), imports, exports, use
  requests/                 contracts only: <name>.query.ts, <name>.command.ts
  client/<feature>/         handlers that run in an app: <name>.handler.ts
  server/<feature>/         handlers that run on the server, and their server-only adapters
  ui/                       only .tsx: blocks, layouts, the root view
  adapters/<what>/          <what>.adapter.ts (the abstract class) + one implementation per platform
  lib/                      everything else used inside the domain: helpers, stores, internal services
  schema/                   <record>.schema.ts
```

**What it gives:** the path from a click to the data is linear: `useCommand(ShowPageCommand)` → `requests/show-page.command.ts` → `client/pages/show-page.handler.ts` → its `this.inject(...)` fields → the module's record that picks the implementation for this platform.

## Common

Common packages hold code with no domain: the engine (`core`: mediator, container, hooks, slots), the kit, behaviors (headless, Radix-style), helpers. Common imports no domain.

## Imports

| From ↓ may import → | app | own domain | another domain                                | common |
| ------------------- | --- | ---------- | --------------------------------------------- | ------ |
| app                 | own | —          | its `index.ts`                                | yes    |
| domain              | no  | anything   | its `index.ts`, if declared in `package.json` | yes    |
| common              | no  | —          | no                                            | yes    |

Inside a domain, `client/` and `ui/` never import `server/`. The graph of domains has no cycle.

## Prior art

| Source                             | Taken                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| MediatR, NestJS CQRS               | a request is sent to a bus; the handler is found by the request and gets its dependencies from the container  |
| NestJS modules                     | a module lists handlers and providers, `imports` and `exports`; a provider another module may use is exported |
| Angular `inject()`                 | a field initialiser takes its dependency while the container builds the class                                 |
| tRPC, Convex                       | one typed contract shared by client and server; a server request is called like a local one                   |
| React Native platform files, Tauri | one interface, one file per platform, chosen by the build                                                     |
| Radix                              | behavior ready-made, the look written by the project                                                          |
| Relay, Fowler's Presentation Model | a block gets data already shaped for what it draws                                                            |
| Drizzle                            | tables as code, migrations generated from them                                                                |
| Stripe idempotency keys            | a write runs once                                                                                             |

Research behind this page: [a simpler architecture](https://claude.ai/artifact/XkjuHUsXeX65WK4bfzEAiC), [coupling between domains](https://claude.ai/artifact/XbHJNHvW3Fr1xGB1zgUkQV).
