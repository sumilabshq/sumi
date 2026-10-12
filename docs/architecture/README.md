# Architecture

The rules every developer and every agent follows when writing code in this repository. Read this page first; the pages below go deeper.

| Page                         | Answers                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------- |
| [placement.md](placement.md) | where a file goes, the folders inside a domain, and the questions an agent asks |
| [handlers.md](handlers.md)   | queries, commands and services, and how they reach each other                   |
| [hosts.md](hosts.md)         | what a host is, what it hands over, servers, secrets and deploy                 |
| [lint.md](lint.md)           | the checks that hold every rule here                                            |
| [legacy.md](legacy.md)       | code written before these rules, and how it leaves                              |

> Status: this is the target. Code under any `legacy/` folder does not follow it yet. A rule marked **planned** is not checked by a tool yet.

## Three levels

```
hosts/       a runtime: obsidian, web, desktop, mobile, api
   ↓
apps/        a product: routes, pages, bindings, the hosts it ships on
   ↓
packages/    domains (business areas) and common (no domain at all)
```

| Level               | Holds                                                                     | Never holds                              |
| ------------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| `hosts/<runtime>`   | how to run any app: rendering engine, storage, files, network, window     | anything about one product               |
| `apps/<product>`    | routes, pages, which handler answers which widget port, the list of hosts | widgets, handlers, schemas               |
| `packages/<domain>` | the widgets, handlers and schemas of one business area                    | the internals of another domain          |
| `packages/<common>` | engine, kit, helpers, data sources, widgets that name no record           | anything that names a record of a domain |

**What it gives:** a product is a file you read in a minute; a host is written once and runs every product; a domain is the one place its rules live.

## Domains

A domain is a business area: `video`, `analytics`, `parental`; for this repository `canvas`, `assistant`, `catalogue`. Nx calls the same cut a _scope_, DDD a _bounded context_. A domain is named by its area, never by the product that uses it first: a chart of channel views is `analytics`, not `studio`.

```
packages/<domain>/
  index.ts              the public API: the only file another package may import
  widgets/<widget>/     one folder per widget (see placement.md)
  logic/<record>/       queries, commands, services
  schemas/              the zod shape of each record — where widgets and logic meet
```

- `widgets/` is cut by what is drawn (`task-kanban`, `task-table`), `logic/` by the kind of record (`tasks`).
- Widgets never import logic, and logic never imports widgets. Both import `schemas/`. A widget reaches logic only through a port the app binds.
- Inside one domain, logic imports logic directly.

**What it gives:** a widget is reused for any record that fits its schema and swapped by the app (A/B tests, redesigns) without touching logic. Logic reads like ordinary code: go-to-definition opens the real function.

## Common

Common packages hold code with no domain: the engine (`core`), the kit (`kit`), helpers, data sources and widgets whose schema names no record (the `registry/` library). Today: `core`, `kit`, `sdk`, `cli`, `vite`, `packs/*`.

A data source is a ready library for an outside system: the vault, Supabase, auth, SQL, or the HTTP API of a backend someone already has. Handlers import it directly.

**Common imports no domain.** So code that needs a domain's schema cannot be put there: the compiler answers "does this belong in common", not a person.

## Imports

| From ↓ may import → | host | app | own domain | another domain              | common |
| ------------------- | ---- | --- | ---------- | --------------------------- | ------ |
| host                | own  | yes | —          | its `index.ts`              | yes    |
| app                 | no   | own | —          | its `index.ts`              | yes    |
| domain              | no   | no  | anything   | its `index.ts`, if declared | yes    |
| common              | no   | no  | —          | no                          | yes    |

- A domain that uses another lists it in its `package.json` dependencies, and imports only its `index.ts`.
- The graph of domains has no cycle. When two domains would need each other, the later one reacts to an event or asks through a port.

**What it gives:** the dependencies of a domain are one list in one file; reaching into another domain's internals is impossible; a central domain (`video`) depends on nobody and everyone may depend on it.

## Size

A file is at most 200 lines. A folder that would list more than about ten files is cut into subfolders by what they are (`hooks/`, `ui/`), never into one long list.

## A new project

| Moment                                      | What exists                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| start                                       | one app, one domain package; it runs inside the studio, no host         |
| a second business area                      | a second domain package                                                 |
| an existing backend                         | a data source in common for its API; handlers call it                   |
| shipping outside the studio                 | the first host (`hosts/web`, `hosts/desktop`)                           |
| the first secret (DB password, payment key) | a server handler; the web host starts serving `/rpc`                    |
| a second product                            | a second app using the same domains                                     |
| a large organisation                        | many domains; a developer opens one domain and its app as the workspace |

No level is added for growth. The three levels stay three.

## Prior art

| Source                                                              | Taken                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| FSD and its 3-layer variants (app / features / shared)              | one-way layers; features cut by what they draw; the API layer shared below them |
| Composition Root (Seemann), Backstage `apiRef`                      | the app is the one place widgets are bound to handlers                          |
| Shopify Packwerk, Spring Modulith                                   | a domain uses another only through its public API, declared and checked         |
| Nx (apps thin, libs hold code, `scope:` tags)                       | domains as packages; lint by tags _(from memory)_                               |
| SvelteKit `.server`, Next `"use server"`, TanStack `createServerFn` | server code marked in code, removed from the browser bundle by the build        |
| Critics of ports everywhere (Rentea, Tarkhanov)                     | a port only where an implementation is really swapped                           |

Research behind this page: [coupling between domains](https://claude.ai/artifact/XbHJNHvW3Fr1xGB1zgUkQV).
