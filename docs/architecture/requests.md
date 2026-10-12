# Requests

Logic lives only in handlers. A view or another handler reaches logic by sending a request to the mediator.

## A request and its handler, one file

```ts skip-check
// packages/billing/requests/subscriptions/subscribe.ts
export const Subscribe = command("billing/subscribe")
	.input(z.object({ user: z.string(), plan: z.string() }))
	.output(SubscriptionSchema)
	.idempotencyKey(({ user, plan }) => `${user}:${plan}`);

export class SubscribeHandler extends handlerOf(Subscribe) {
	private readonly payments = inject(Payments);
	private readonly subscriptions = inject(Subscriptions);
	override async handle(input: InputOf<typeof Subscribe>, { idempotencyKey }: RequestContext) { … }
}
```

| Kind                         | Must declare         | May declare             |
| ---------------------------- | -------------------- | ----------------------- |
| `query("<module>/<name>")`   | `.output()`          | `.input()`              |
| `command("<module>/<name>")` | `.idempotencyKey(…)` | `.input()`, `.output()` |

- The name `"<module>/<name>"` is the request's address on the network (`/rpc/billing/subscribe`), in logs and in the table of done keys. It is stable across a rename of the constant. Lint checks it equals the module and the constant's name in kebab case.
- `handlerOf(Subscribe)` names the request once: it is the class's `static request`, and the types check `handle` takes its input and returns its output. A module takes only classes made by `handlerOf`.
- The output schema decides whether `null` is a valid answer. A handler cannot return what its schema does not allow.

## The mediator

`send(Request, input)` validates the input (zod), runs the module's middleware, finds the handler by the request, runs it, validates the output, and answers `{ ok: true, output }` or `{ ok: false, reason, ran }`. A view never calls `send` directly; it uses `useQuery` / `useCommand` ([views.md](views.md)).

Middleware is declared once per module: `use: [authenticated, rateLimited]`. A handler holds no auth checks of its own. Middleware gets a frozen input, and a second `next()` answers the first one's promise.

Every refusal reaches the developer once, through `ReportFailure`: the console by default, `provided(ReportFailure, …)` to send it to Sentry. After a command that ran, every query on screen is read again.

## Modules

```ts skip-check
// packages/billing/billing.module.ts
export const billingModule = module({
	handlers: [SubscribeHandler, ApplyStripeEventHandler, GetMySubscriptionHandler],
	provide: [
		provided(Payments, (host) => (host.is("mobile") ? new RevenueCatPayments(host) : new StripePayments(host))),
		provided(Subscriptions, (host) => new DrizzleSubscriptions(host.db)),
	],
	use: [authenticated],
});
```

- A dependency is a token, `export const Payments = token<Payments>("Payments")`, and `provided(Payments, make)` type-checks that `make` returns a `Payments`.
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
export interface Payments {
	subscribe(input: { user: string; plan: string; idempotencyKey: string }): Promise<Subscription>;
}
export type PaymentRefusal = "card-declined" | "already-subscribed" | "provider-down";
```

- Each adapter (`StripePayments`, `RevenueCatPayments`, a fake) turns its provider's errors into the port's refusals and retries what may be retried.
- One contract test runs against every adapter, so switching adapters keeps behaviour.
- The module picks the adapter; the handler knows only the port.

## The server

A request whose handler must run on a server (it holds a secret, or receives webhooks) says so in its file: `command(…).onServer()`. The client's mediator sends it over `/rpc/<name>`; the server registers its handler; secrets live only in the server's `provide`. The build fails when a client bundle reaches a server-only file. A host with no server refuses such a request at build time.

## Webhooks

A webhook lands on a server route, is verified, and is **stored raw first** (an inbox row), then answered `2xx`. A command applies it, keyed by the provider's event id. An event the strict schema refuses stays in the inbox marked failed with the reason and is applied again after the fix; nothing is dropped. A periodic job compares our rows with the provider and repairs drift.
