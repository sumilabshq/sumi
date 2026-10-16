# Requests

Logic lives only in handlers. A view or another handler reaches logic by sending a request to the mediator.

## A contract and its handler

The contract says what may be asked; it is shared by every side and holds no logic.

```ts skip-check
// packages/billing/requests/subscribe.command.ts
export const SubscribeCommand = command("billing/subscribe")
	.input(z.object({ user: z.string(), plan: z.string() }))
	.output(SubscriptionSchema)
	.idempotencyKey(({ user, plan }) => `${user}:${plan}`)
	.onServer();
```

```ts skip-check
// packages/billing/server/subscriptions/subscribe.handler.ts
export class SubscribeCommandHandler extends handlerOf(SubscribeCommand) {
	private readonly payments = this.inject(Payments);
	private readonly subscriptions = this.inject(Subscriptions);

	override async handle(input: InputOf<typeof SubscribeCommand>, { idempotencyKey }: RequestContext) { … }
}
```

| Kind                         | Must declare         | May declare                            |
| ---------------------------- | -------------------- | -------------------------------------- |
| `query("<module>/<name>")`   | `.output()`          | `.input()`, `.onServer()`              |
| `command("<module>/<name>")` | `.idempotencyKey(…)` | `.input()`, `.output()`, `.onServer()` |

- The name `"<module>/<name>"` is the request's address on the network (`/rpc/billing/subscribe`), in logs and in the table of done keys. Lint holds it equal to the module and the constant without its `Query`/`Command` suffix, in kebab case.
- `handlerOf(Request)` names the request once: it is the class's `static request`, and the types check that `handle` takes its input and returns its output. A module takes only classes made by `handlerOf`.
- The output schema decides whether `null` is a valid answer. A handler cannot return what its schema does not allow.

## The handler base

`handlerOf(Request)` returns a class extending `RequestHandler`, which gives every handler three members:

| Member                                | Does                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `this.inject(X)`                      | in a field initialiser: the instance of `X` the module provides for this platform          |
| `this.send(Request, input, options?)` | sends another request through the same mediator; typed input, typed `CommandAnswer` output |
| `watch({ input, changed })`           | a query whose data changes outside a command overrides it; the base watches nothing        |

```ts skip-check
export class PageTabsQueryHandler extends handlerOf(PageTabsQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof PageTabsQuery>> { … }

	override watch({ changed }: Watching<typeof PageTabsQuery>): () => void {
		return watchPages(this.designReads, this.canvasStore, changed);
	}
}
```

A handler is built only by `app()`: `new SomeHandler()` anywhere else throws, naming the class. `this.inject` works because the container sets a building slot while it builds the class (Angular's `inject()`); a constructor parameter would need decorator metadata, which this project does not use.

## The mediator

`send(Request, input)` validates the input (zod), runs the module's middleware, finds the handler by the request, runs it, validates the output, and answers `{ ok: true, output }` or `{ ok: false, reason, ran }`. A view never calls `send` directly; it uses `useQuery` / `useCommand` ([views.md](views.md)).

Middleware is declared once per module: `use: [authenticated, rateLimited]`. A handler holds no auth checks of its own. Middleware gets a frozen input, and a second `next()` answers the first one's promise.

Every refusal reaches the developer once, through `ReportFailure`: the console by default, a module providing `ReportFailure` sends it elsewhere. After a command that ran, every query on screen is read again. A re-read keeps every part of the answer that did not change by identity (TanStack Query's structural sharing), so a block that drew it does not draw again.

## Modules

```ts skip-check
// packages/canvas/canvas.module.ts
export const canvasModule = module({
	name: "canvas",
	handlers: [PageTabsQueryHandler, ShowPageCommandHandler, …],
	provide: [
		provided(DesignSource, {
			obsidian: obsidianDesignSourceOf,
			web: (host) => new ProjectDesignSource(host.project),
		}),
		provided(DesignReads, {
			obsidian: (_host, inject) => new CachedDesignReads(inject(DesignSource)),
			web: (_host, inject) => new CachedDesignReads(inject(DesignSource)),
		}),
	],
	imports: [],
	exports: [],
});
```

- A dependency is an abstract class, and the class is its own token: `export abstract class DesignSource { abstract design(app: string): Promise<DrawnDesign>; }`.
- `provided(Token, record)` takes one factory per platform. Each factory receives **its own platform's host**, typed (`host.project` exists only in `web`), and an `inject` for the dependencies the built value needs as constructor arguments. A bare factory for every platform is a type error.
- **Where a dependency is provided is where it lives.** A record with only `server` makes the dependency server-only; giving it `web` and `obsidian` keeps it on the client. Nothing is client-only by nature.
- **A module injects only its own providers and what its imports export.** `module({ imports: [designModule] })` and `exports: [DesignSource]` on the other side. Anything else is refused by `app()`, naming the handler, both modules and the fix.
- `app()` refuses two handlers for one request, two providers for one token, a handler in a module its request does not name, a module exporting what it does not provide, and an import the app does not list. A request no module handles is refused when it is sent: `no module handles canvas/pages`.
- Swapping an implementation is one entry in a record. Swapping a handler is one line in `handlers`. A test builds a module with fakes in `provide`.

## Platforms

```ts skip-check
const app = app({ modules: [canvasModule], platforms: ["obsidian", "web"], host });
```

- The platforms are one union, `"obsidian" | "web" | "mobile" | "desktop" | "server"`, declared by the engine together with the global `__WG_PLATFORM__`. Every build defines it (esbuild or Vite `define`), the test loader sets it, so it is never undefined and nothing checks its type.
- `platforms` names where the app ships. **A dependency with no factory for one of them is a type error** at `app(...)` when the modules are a literal list, and `app()` refuses it at start in every case, naming the dependency, its module and the platform.
- `app()` refuses a host of another platform than the build: the host an Obsidian build receives is an `ObsidianHost`.
- A handler reads where it runs from `ctx.host.platform`.
- A platform that physically cannot do something (a browser cannot write to a folder) gets an implementation that does it another way or refuses with a reason the person reads; that choice is one entry in the record.

Hosts, their typed fields and how a build keeps only its own platform's adapters: [hosts.md](hosts.md).

## Idempotency

Every command declares how a repeat is recognised. The type refuses a command that declares nothing.

| Declaration                   | Meaning                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.idempotencyKey(input => …)` | the same data is the same action: a repeat does nothing and answers the first answer                                                                                                           |
| `.idempotencyKey("per-call")` | each call is new; `useCommand` makes the key and keeps it for that input until an answer that ran, so only a retry or a double submit of that call is dropped; `send` without a key is refused |
| `.idempotencyKey("none")`     | repeats are wanted (a "+1" counter)                                                                                                                                                            |

The mediator keeps done keys in a table and passes `idempotencyKey` to the handler, which hands it on to a provider that supports one (Stripe). The default table is in memory and keeps the last 1000 keys; a module providing `DoneKeys` keeps them elsewhere. A throw after the handler was entered answers `ran: true`, and its key stays done.

An idempotency key stops **the same call** twice. Two different calls that would leave broken data are stopped by the database: see Data.

## The server

A request whose handler must run on a server (it holds a secret, or receives webhooks) says so in its contract: `.onServer()`. Its handler lives in `server/<feature>/`. There is one contract and one module, not two roots:

- In an app, the mediator never builds a `.onServer()` handler. It sends the request through `ServerTransport`; the input is validated before it leaves and the answer is held to the output schema when it comes back.
- Until a server exists the transport is `NoServerTransport`, which refuses: `billing/subscribe runs on the server, and no server is configured for this app`. **planned**: a tRPC transport posting to `/rpc/<name>`, and `apps/server` running `server({ modules })` with the `server` factories.
- **A client handler that injects a dependency provided only for `server` is refused by `app()` at start**, with the fix:

  > `TotalQueryHandler injects Ledger, which is provided only on server. Mark the request .onServer(), or keep it on the client and send a server request from it.`

  It is a start-time refusal, not a type error: the class that injects and the record that provides are in different files, and only the app joins them.

### Calling the server from the client

**Problem:** a client handler holds state the server does not have (a draft, the canvas), and the work needs the server (a database, a secret). **Pattern:** keep the handler on the client and `this.send` a server request from it; its typed output is the server's answer.

```ts skip-check
export class SaveDraftCommandHandler extends handlerOf(SaveDraftCommand) {
	private readonly editorStore = this.inject(EditorStore);

	override async handle() {
		const draft = this.editorStore.now().draft;
		this.editorStore.change({ draft: { ...draft, status: "saving" } }, "save started");
		const answer = await this.send(StoreDraftCommand, draft);
		if (!answer.ok) return this.editorStore.change({ draft: { ...draft, status: "unsaved" } }, answer.reason);
		this.editorStore.change({ draft: answer.output }, "saved by the server");
	}
}
```

`StoreDraftCommand` is `.onServer()`. The local state changes first, then takes the server's answer as the truth; a refusal puts it back and reaches the one refusal handler.

## Live data: `watch`

A query handler overrides `watch({ input, changed })` when its data can change from outside (a file edited on disk, a job finishing). The mediator calls it while someone reads the query and reads again on `changed()`.

- On the client, `watch` listens to a store, a file, a timer.
- On the server, the same `watch` becomes a live subscription: one connection per browser and one server watch per query key however many people look. Prior art: Convex `useQuery` over a WebSocket. **planned**

## Data

Tables are Drizzle code in `schema/`; the zod shapes requests use are derived from them (`drizzle-zod`). Migrations are generated from the tables, never written by hand. **planned**

- **Uniqueness is an explicit choice.** Every table declares it: `unique: [["userId", "plan"]]` or `unique: "none"`.
- **Two people editing one row:** a `version` column; an update matches `WHERE id = ? AND version = ?`, and zero rows answer "conflict" instead of overwriting.
- **A destructive migration** is refused unless the change says so explicitly; every migration runs first on a copy of the data and reports what changed.

## Adapters

An outside system is reached through an adapter: an abstract class with typed methods and a closed list of refusals, in `adapters/<what>/<what>.adapter.ts`, with one implementation per platform beside it.

- Each implementation turns its provider's errors into the adapter's refusals and retries what may be retried.
- One contract test runs against every implementation, so switching keeps behaviour.
- The module picks the implementation per platform; the handler knows only the abstract class.
- An adapter holds only the calls to its system. A decision about data (which note to return to, how a drawn state is chosen) is a domain rule in `lib/` or a handler.

## Background work

**planned.** Three kinds, declared in a module beside its handlers:

| Kind                                     | Runs                        | Client                        | Server on a long-lived process | Server on Vercel / serverless                            |
| ---------------------------------------- | --------------------------- | ----------------------------- | ------------------------------ | -------------------------------------------------------- |
| `cron("<module>/<name>", "*/5 * * * *")` | on a schedule               | a timer while the app is open | in the process                 | the platform's scheduler (Vercel Cron) calls its route   |
| `worker("<module>/<name>")`              | one job until done, retried | in the background of the tab  | in the process, from a queue   | a queue service calls its route per job                  |
| `loop("<module>/<name>")`                | forever                     | while the app is open         | in the process                 | not possible: a build error that names the deploy target |

Each kind is a handler like any other (`extends handlerOf(...)`, `this.inject`, idempotency on every job). Prior art: Vercel Cron Jobs, Inngest and Trigger.dev (from memory, to be checked when built).

## Webhooks

**planned.** A webhook lands on a server route, is verified, and is **stored raw first** (an inbox row), then answered `2xx`. A command applies it, keyed by the provider's event id. An event the strict schema refuses stays in the inbox marked failed with the reason and is applied again after the fix. A periodic job compares our rows with the provider and repairs drift.
