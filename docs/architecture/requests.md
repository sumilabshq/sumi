# Requests

Logic lives only in handlers. A view or another handler reaches logic by sending a request to the mediator.

## A request and its handler, one file

```ts skip-check
// packages/billing/requests/subscriptions/subscribe.ts
export const SubscribeCommand = command("billing/subscribe")
	.input(z.object({ user: z.string(), plan: z.string() }))
	.output(SubscriptionSchema)
	.idempotencyKey(({ user, plan }) => `${user}:${plan}`);

export class SubscribeCommandHandler extends handlerOf(SubscribeCommand) {
	private readonly payments = this.inject(Payments);
	private readonly subscriptions = this.inject(Subscriptions);
	override async handle(input: InputOf<typeof SubscribeCommand>, { idempotencyKey }: RequestContext) { … }
}
```

| Kind                         | Must declare         | May declare             |
| ---------------------------- | -------------------- | ----------------------- |
| `query("<module>/<name>")`   | `.output()`          | `.input()`              |
| `command("<module>/<name>")` | `.idempotencyKey(…)` | `.input()`, `.output()` |

- The name `"<module>/<name>"` is the request's address on the network (`/rpc/billing/subscribe`), in logs and in the table of done keys. It is stable across a rename of the constant. Lint checks it equals the module and the constant's name without its `Query`/`Command` suffix, in kebab case.
- `handlerOf(SubscribeCommand)` names the request once: it is the class's `static request`, and the types check `handle` takes its input and returns its output. A module takes only classes made by `handlerOf`.
- The output schema decides whether `null` is a valid answer. A handler cannot return what its schema does not allow.

## The mediator

`send(Request, input)` validates the input (zod), runs the module's middleware, finds the handler by the request, runs it, validates the output, and answers `{ ok: true, output }` or `{ ok: false, reason, ran }`. A view never calls `send` directly; it uses `useQuery` / `useCommand` ([views.md](views.md)).

Middleware is declared once per module: `use: [authenticated, rateLimited]`. A handler holds no auth checks of its own. Middleware gets a frozen input, and a second `next()` answers the first one's promise.

Every refusal reaches the developer once, through `ReportFailure`: the console by default, `provided(ReportFailure, …)` to send it to Sentry. After a command that ran, every query on screen is read again.

A query whose data changes outside a command (a file edited on disk, a job finishing) declares `watch(input, changed)` on its handler; the mediator calls it while someone reads the query and reads it again on `changed()`. A re-read keeps every part of the answer that did not change by identity (TanStack Query's structural sharing), so a block that drew it does not draw again.

## Modules

```ts skip-check
// packages/billing/billing.module.ts
export const billingModule = module({
	handlers: [SubscribeCommandHandler, ApplyStripeEventCommandHandler, MySubscriptionQueryHandler],
	provide: [
		provided(Payments, {
			server: (host) => new StripePayments(host.env.STRIPE_SECRET),
			mobile: (host) => new RevenueCatPayments(host),
		}),
		provided(Subscriptions, { server: (host) => new DrizzleSubscriptions(host.db) }),
	],
	use: [authenticated],
});
```

- A dependency is an abstract class, and the class is its own token (Angular, NestJS): `export abstract class Payments { abstract subscribe(…): Promise<Subscription>; }`. `provided(Payments, make)` type-checks that `make` returns a `Payments`; an error names it by `Payments.name`.
- A handler injects what it calls. `this.reads.source.addPhotos(…)` reaches through one dependency into another: inject `DesignSource` for the write and keep `DesignReads` for what it owns.
- `app()` refuses two handlers for one request. A request no module handles is refused when it is sent: `no module handles canvas/pages`.
- The container builds each handler, and `inject(Payments)` in a field initialiser takes the value the module provides (Angular's `inject()`). It works only while the container builds a handler or a provided value: a constructor parameter would need decorator metadata, which this project does not use. No page or app writes `new SomeHandler(...)`.
- Swapping an implementation is one line in `provide`. Swapping a handler is one line in `handlers`.
- An app lists the modules it uses; a test builds a module with fakes in `provide`.

## Idempotency

Every command declares how a repeat is recognised. The type refuses a command that declares nothing.

| Declaration                   | Meaning                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.idempotencyKey(input => …)` | the same data is the same action: a repeat does nothing and answers the first answer                                                                                                           |
| `.idempotencyKey("per-call")` | each call is new; `useCommand` makes the key and keeps it for that input until an answer that ran, so only a retry or a double submit of that call is dropped; `send` without a key is refused |
| `.idempotencyKey("none")`     | repeats are wanted (a "+1" counter)                                                                                                                                                            |

The mediator keeps done keys in a table and passes `idempotencyKey` to the handler, which hands it on to a provider that supports one (Stripe). The default table is in memory and keeps the last 1000 keys; a project provides `DoneKeys` to keep them elsewhere. A throw after the handler was entered answers `ran: true`, and its key stays done.

An idempotency key stops **the same call** twice. Two different calls that would leave broken data are stopped by the database: see Data.

## Data

Tables are Drizzle code in `schema/`; the zod shapes requests use are derived from them (`drizzle-zod`). Migrations are generated from the tables, never written by hand.

- **Uniqueness is an explicit choice.** Every table declares it: `unique: [["userId", "plan"]]` or `unique: "none"`. A thin wrapper around Drizzle's table function refuses a table that says nothing. No ORM of our own.
- **Two people editing one row:** a `version` column; an update matches `WHERE id = ? AND version = ?`, and zero rows answer "conflict" instead of overwriting.
- **A destructive migration** (dropping a column or table, narrowing a type) is refused unless the change says so explicitly; every migration runs first on a copy of the data and reports what changed. **planned**
- An existing database is read with `drizzle-kit pull`. Whether every dialect a project needs (MS SQL) is covered is to be checked before relying on it.

## Ports and adapters

An outside system is reached through a port: an interface with typed methods and a closed list of refusals.

```ts skip-check
// packages/payments/payments.port.ts
export abstract class Payments {
	abstract subscribe(input: { user: string; plan: string; idempotencyKey: string }): Promise<Subscription>;
}
export type PaymentRefusal = "card-declined" | "already-subscribed" | "provider-down";
```

- Each adapter (`StripePayments`, `RevenueCatPayments`, a fake) turns its provider's errors into the port's refusals and retries what may be retried.
- One contract test runs against every adapter, so switching adapters keeps behaviour.
- The module picks the adapter; the handler knows only the port.

## Platforms

One interface, one implementation per platform, chosen at build — the way a Tauri plugin keeps `desktop.rs` and `mobile.rs` behind one API. **The server is a platform like any other.**

```ts skip-check
provided(DesignSource, {
	obsidian: (host) => new ObsidianDesignSource(host.vault),
	web: (host) => new WebDesignSource(host.project),
});
```

- The platforms are one union, `"obsidian" | "web" | "mobile" | "desktop" | "server"`, declared once by the framework as the global `__WG_PLATFORM__`, set by each build (esbuild or Vite `define`) and by the test loader. No `typeof` check, no `undefined`. The bundler drops every branch but the build's own.
- Each factory receives the host of its own platform, typed: `host.vault` exists only inside `obsidian`. A missing capability is a type error, never a null to check.
- An app names where it ships: `app({ modules, platforms: ["obsidian", "web"] })`. A dependency a handler injects with no implementation for one of those platforms is a build error naming the dependency and the platform.
- **Where a dependency is provided is where it lives.** `StripeGateway` provided only for `server` does not exist in a browser; `CanvasStore` provided for `web` and `obsidian` lives on the client, and giving it a `server` entry moves it. Nothing is client-only or server-only by nature.
- A platform that physically cannot do something (a browser cannot write to a folder) gets an implementation that does it another way (IndexedDB) or refuses with a reason the person reads. Choosing which is a line in the record, decided once.
- A handler reads where it runs from `ctx.host.platform`: `"server"` inside a `.onServer()` request, the app's platform otherwise.

## The server

A request whose handler must run on a server (it holds a secret, or receives webhooks) says so once, in its file: `command(…).onServer()`. There is one app, not two roots: the same `app({ modules })` runs in the browser, where the mediator sends every `.onServer()` request over `/rpc/<name>`, and on the server, where it runs them with the `server` implementations. A `.onServer()` handler that injects a dependency with no `server` entry, or a client handler that injects one provided only for `server`, is a build error whose message says the fix:

> `ChargeCardCommand` injects `StripeGateway`, which is provided only on `server`. Mark the request `.onServer()`, or keep it on the client and `send` a server request from it.

**planned**: `.onServer()`, the `server` platform and `/rpc` are not implemented yet.

### Calling the server from the client

**Problem:** a client handler holds state the server does not have (a draft, the canvas), and the work needs the server (a database, a secret). **Pattern:** keep the handler on the client and `send` a server request from it; its typed output is the server's answer.

```ts skip-check
export const SaveDraftCommand = command("editor/save-draft").idempotencyKey("per-call");

export class SaveDraftCommandHandler extends handlerOf(SaveDraftCommand) {
	private readonly editorStore = this.inject(EditorStore);

	override async handle() {
		const draft = this.editorStore.now().draft;
		this.editorStore.change({ draft: { ...draft, status: "saving" } }, "save started");
		const answer = await this.send(StoreDraftCommand, draft); // StoreDraftCommand is .onServer()
		if (!answer.ok) return this.editorStore.change({ draft: { ...draft, status: "unsaved" } }, answer.reason);
		this.editorStore.change({ draft: answer.output }, "saved by the server");
	}
}
```

- `this.send` is the API call: typed input, typed output, one visible line — no fetch, no route, no controller.
- The local state changes first (optimistic), then takes the server's answer as the truth; a refusal puts it back and reaches the one refusal handler.
- A `useQuery` reading that server data stays fresh by its `watch`, so other blocks see the saved draft too.

## Live data: `watch`

`watch` is part of every query handler (the base declares it; a handler overrides it when its data can change from outside). It calls `changed()` when the data moved; every `useQuery` of that query reads again and draws the new answer.

- On the client, `watch` listens to a store, a file, a timer.
- On the server, the same `watch` becomes a live subscription: the framework keeps one connection per browser (WebSocket or SSE) and one server watch per query key however many people look, batching changes. Prior art: Convex `useQuery` over a WebSocket, re-run when a write touches what the query read. **planned**
- A query that injects a client-provided dependency cannot be `.onServer()` (a build error), so local state is never pushed through the server.

## Background work

**planned.** Three kinds, declared in a module beside its handlers:

| Kind                                     | Runs                        | Client                        | Server on a long-lived process | Server on Vercel / serverless                            |
| ---------------------------------------- | --------------------------- | ----------------------------- | ------------------------------ | -------------------------------------------------------- |
| `cron("<module>/<name>", "*/5 * * * *")` | on a schedule               | a timer while the app is open | in the process                 | the platform's scheduler (Vercel Cron) calls its route   |
| `worker("<module>/<name>")`              | one job until done, retried | in the background of the tab  | in the process, from a queue   | a queue service calls its route per job                  |
| `loop("<module>/<name>")`                | forever                     | while the app is open         | in the process                 | not possible: a build error that names the deploy target |

Each kind is a handler like any other (`extends handlerOf(...)`, `this.inject`, idempotency on every job), so the rules above hold for it. Which deploy target an app ships to decides how the framework runs it, never the handler. Prior art: Vercel Cron Jobs, Inngest and Trigger.dev for queued jobs on serverless (from memory, to be checked when built).

## Webhooks

A webhook lands on a server route, is verified, and is **stored raw first** (an inbox row), then answered `2xx`. A command applies it, keyed by the provider's event id. An event the strict schema refuses stays in the inbox marked failed with the reason and is applied again after the fix; nothing is dropped. A periodic job compares our rows with the provider and repairs drift.
