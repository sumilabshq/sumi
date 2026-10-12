# Architecture

The rules every developer and every agent follows when writing code in this repository. Read this page first; the pages below go deeper.

| Page                         | Answers                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| [requests.md](requests.md)   | requests and their handlers, the mediator, modules, idempotency, data, integrations, the server |
| [views.md](views.md)         | blocks, layouts, slots, how a view reads and writes, loading, error and empty                   |
| [placement.md](placement.md) | where each file goes                                                                            |
| [hosts.md](hosts.md)         | platforms, deploy, secrets, webhooks                                                            |
| [lint.md](lint.md)           | the checks that hold every rule here                                                            |
| [legacy.md](legacy.md)       | code written before these rules, and how it leaves                                              |

> Status: this is the target. The code still runs on the earlier widget builder and handles; it moves domain by domain, the canvas first. A rule marked **planned** is not checked by a tool yet.

## Three rules

Everything else on these pages follows from them.

1. **Imports go one way: `apps` → `packages`.** A package never imports an app. A domain uses another domain only through its `index.ts`.
2. **A file's place is what it is.** A request and its handler → one file in `requests/`. What is drawn → a block in `blocks/`. Where blocks stand → a layout. Which implementation runs → the domain's module.
3. **Nothing reaches for anything.** A view sends requests through the mediator. A handler gets its dependencies in its constructor from the module's container. The platform is given by the framework (`host`). No hidden globals, no singletons.

## Names

One word declares a thing; the constant says which one.

| Declares                      | Written                                      | Named                  | Example           |
| ----------------------------- | -------------------------------------------- | ---------------------- | ----------------- |
| a read                        | `query("<module>/<name>")`                   | PascalCase verb phrase | `GetPages`        |
| a write                       | `command("<module>/<name>")`                 | PascalCase verb phrase | `ShowPage`        |
| its logic                     | `class … implements Handles<typeof X>`       | `<Request>Handler`     | `ShowPageHandler` |
| a domain's wiring             | `module({ handlers, provide, use })`         | `<domain>Module`       | `canvasModule`    |
| variables                     | `env({ server, client })`                    | `<part>Env`            | `stripeEnv`       |
| an outside system             | `interface`                                  | the system             | `Payments`        |
| its implementation            | `class … implements Payments`                | `<Provider><System>`   | `StripePayments`  |
| reading and writing in a view | `useQuery`, `useOptionalQuery`, `useCommand` | —                      | —                 |

No `define…` or `create…` prefix on these: the word itself is the declaration. A request's string name is `<module>/<the constant in kebab case>` (`canvas/show-page`).

## Two levels

```
apps/        a product: routes, pages, which modules it uses
   ↓
packages/    domains (business areas) and common (no domain at all)
```

Hosts are part of the framework, not of a project: `@widgetarium/host-obsidian`, `@widgetarium/host-web`. An app runs on them; a project writes no host code. A module reads `host.is("obsidian")` and the host's raw objects (`host.vault`, `host.window`) when it picks an implementation.

## Domains

A domain is a business area: `video`, `analytics`, `billing`; for this repository `canvas`, `assistant`, `catalogue`. Named by its area, never by the product that uses it first.

```
packages/<domain>/
  index.ts                  the public API: requests, blocks, the module
  <domain>.module.ts        the handlers it registers, the implementations it provides, its middleware
  requests/<feature>/       one file per request: the request and its handler
  blocks/<block>/           what is drawn: a component that reads its own requests
  layouts/                  where blocks stand; no data
  ports/                    interfaces for outside systems + their adapters
  schema/                   Drizzle tables and the zod shapes derived from them
```

**What it gives:** one feature is one request file and one block. The path from a click to the data is linear: `useCommand(ShowPage)` → `show-page.ts` (the handler is below the request) → its constructor → the module's one line that picks the implementation.

## Common

Common packages hold code with no domain: the engine (`core`: mediator, container, hooks, slots), the kit, behaviors (headless, Radix-style), ports with adapters for outside systems, helpers. Common imports no domain.

## Imports

| From ↓ may import → | app | own domain | another domain                                | common |
| ------------------- | --- | ---------- | --------------------------------------------- | ------ |
| app                 | own | —          | its `index.ts`                                | yes    |
| domain              | no  | anything   | its `index.ts`, if declared in `package.json` | yes    |
| common              | no  | —          | no                                            | yes    |

The graph of domains has no cycle.

## Prior art

| Source                                | Taken                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| MediatR, NestJS CQRS                  | a request is sent to a bus; the handler is found by the request's type and gets its dependencies from the container |
| NestJS modules                        | a module lists its handlers and providers; swapping an implementation is one line                                   |
| Vertical slices (Bogard, CodeOpinion) | a request and its handler in one file                                                                               |
| Radix                                 | behavior ready-made, the look written by the project                                                                |
| Relay, Fowler's Presentation Model    | a block gets data already shaped for what it draws                                                                  |
| Drizzle                               | tables as code, migrations generated from them                                                                      |
| Stripe idempotency keys, Convex       | a write runs once; typed queries and mutations                                                                      |

Research behind this page: [a simpler architecture](https://claude.ai/artifact/XkjuHUsXeX65WK4bfzEAiC), [coupling between domains](https://claude.ai/artifact/XbHJNHvW3Fr1xGB1zgUkQV).
