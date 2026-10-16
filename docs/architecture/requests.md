# Requests

Logic lives only in handlers. A view or another handler reaches logic by sending a request through the mediator. Everything here is exported from `@widgetarium/core/requests`.

## A contract

The contract says what may be asked and who may ask it; it is shared by every side and holds no logic. It lives in `features/<feature>/contract.ts`.

```ts skip-check
export const ChargeCommand = command("billing/charge")
	.guard(AuthenticatedGuard)
	.guard(HasPermissionGuard(BillingPermissions.charge))
	.input(ChargeInputSchema)
	.output(ChargeSchema)
	.idempotencyKey(PerCall)
	.rateLimit({ calls: 10, per: minutes(1) });

export const PagesQuery = query("canvas/pages")
	.input(z.object({ app: z.string() }))
	.output(PagesSchema)
	.cache({ freshFor: seconds(30) });
```

| Declaration                                    | On      | Means                                                                                      |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `.guard(SomeGuard)`                            | both    | **required on a server module's request**, absent on a client module's ([Guards](#guards)) |
| `.input(S)`, `.output(S)`                      | both    | zod schemas; omitted means `void`                                                          |
| `.idempotencyKey(PerCall \| Repeatable \| fn)` | command | **required**: a command with no key is a type error                                        |
| `.rateLimit({ calls, per })`                   | both    | overrides the server's default                                                             |
| `.cache({ freshFor })`                         | query   | the time an answer stays fresh (TanStack's `staleTime`)                                    |
| `.settlesNow()`                                | query   | answered synchronously on its first read of a local module                                 |
| `.invalidates([Query, …])`                     | command | the queries re-read after it ran; without it every query on screen is re-read              |

- The name `"<module>/<name>"` is the request's address on the wire (`/rpc/billing/charge`), in logs and in done keys. `query()` throws on a name that is not kebab case `<module>/<name>`; lint holds it equal to the domain and the constant without its suffix.
- **Strings only for free-form data** (request names, reasons). Every other choice is a typed value: a guard, a `permission("…")` constant, `PerCall` / `Repeatable`, a `Duration` (`seconds(n)`, `minutes(n)`, `hours(n)`, `duration({ hours: 1, minutes: 5 })`).

## Guards

Guards run **only on the server**. A client app validates schemas and nothing else: no guard, no rate limit, no `Authenticate`, and `user` is `null` in a client handler. A client module's requests carry no guard; a request handled by a `runs: "server"` module carries at least one, or `module({ runs: "server" })` is a type error and `server()` refuses to start.

| Guard                      | Lets through                                |
| -------------------------- | ------------------------------------------- |
| `PublicGuard`              | anyone; explicit, and nothing may follow it |
| `AuthenticatedGuard`       | a signed-in user                            |
| `HasPermissionGuard(perm)` | a user holding that permission              |
| `guard({ inject, check })` | a project's own                             |

A guard is one value, shaped like a handler:

```ts skip-check
export const OwnsInvoiceGuard = guard({
	inject: { invoices: Invoices },
	check: async ({ input, user }, { invoices }) => {
		const invoice = await invoices.byId(input.id);
		return invoice?.ownerId === user?.id ? null : { code: "forbidden", reason: "not your invoice" };
	},
});

command("billing/refund").guard(AuthenticatedGuard).guard(OwnsInvoiceGuard);
```

- `check` answers `null` or `{ code: "unauthenticated" | "forbidden" | "refused-by-guard", reason }`. No class, no registration, no string name: the value is the guard.
- **A guard gets every dependency through `inject`**, resolved from the `provide` of the request's server module, and imports nothing server-only. Its code may then sit in a client bundle harmlessly; a guard importing a server-only module fails the client build, because a server module's `package.json` exposes `./module` only under the `widgetarium-server` condition, which only `apps/server` sets.
- **A guard never holds a secret.** The server host's `Authenticate` (an abstract class, `userOf(headers) → User | null`, exported with `server` from `@widgetarium/core/requests/server`) turns the request's token (headers) into `user`; whether permissions come from JWT claims or the database is the project's `Authenticate`'s choice. Guards read `user` and may query more.

## Policy order

Fixed:

```
client: input → idempotency key (minted if PerCall and absent) → in-flight dedup → handler → output
server: input → Authenticate → guards → rate limit → idempotency key → in-flight dedup (per user) → handler → output
```

- **Rate limit:** `SERVER_RATE_LIMIT` (120 calls a minute per request and user) unless the request declares its own. A client has none.
- **In-flight dedup:** a second identical query waits for the first and gets its answer. On the server it is keyed by request, input and user and runs after the guards, so one user never receives an answer another was allowed.
- Every refusal reaches the developer once through the host's `reportFailure` (the console by default) and the person once through the app's refusal handler ([views.md](views.md)).

## Idempotency

| Declaration                   | Meaning                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `.idempotencyKey(input => …)` | the same data is the same action: a repeat does nothing and answers the first answer |
| `.idempotencyKey(PerCall)`    | each call is new; the key travels with the call                                      |
| `.idempotencyKey(Repeatable)` | repeats are wanted (a "+1" counter)                                                  |

- **Done keys are scoped per user:** `${request}:${user.id ?? "anonymous"}:${key}` (Stripe scopes keys per account); on a client `user` is always anonymous. A second call with a key still running waits for the first and gets its answer.
- **`PerCall` keys:** the client mediator mints one for a call sent with none; `useCommand` keeps one key per call so only a retry of that same call reuses it. A server refuses a `PerCall` call that arrives with no key (`missing-key`).
- The handler receives `idempotencyKey` and hands it on to a provider that supports one (Stripe).
- `DoneKeys` is abstract. `MemoryDoneKeys` keeps the last 1000 and evicts only settled answers, never a pending claim. TODO: a durable store with pending-with-expiry for a server with more than one process.
- An idempotency key stops **the same call** twice. Two different calls that would leave broken data are stopped by the database (see Data).

## `ran`

Every answer is `{ ok: true, output }` or `{ ok: false, code, reason, ran }`.

- A command whose handler throws answers `ran: true`: the write may have happened, so it is never retried and its done key stays.
- A handler that refuses **before** writing calls `refuse(reason)` (it throws `Refused`); the answer is `{ ok: false, code: "refused", ran: false }` and the done key is released, so a corrected call may run.

## A handler

A plain function bound to its contract, in `features/<feature>/handlers.ts`:

```ts skip-check
export const chargeHandler = handler(ChargeCommand, {
	inject: { billingDb: BillingDb },
	run: (input, { billingDb, idempotencyKey, signal, user }) => billingDb.insertCharge(input, idempotencyKey),
});
```

- `inject` maps a key to an abstract class; `run` receives those instances plus `idempotencyKey`, `signal` and `user` (`null` in a client module). Types check that `run` takes the contract's input and returns its output.
- **A test calls it directly:** `await chargeHandler.run(input, { billingDb: fakeBillingDb })`.
- A handler may run another handler of its module the same way (`addPhotosHandler.run(input, injected)`); a request of another module is sent through the app.

### Live data: `watch`

```ts skip-check
export const pageTabsHandler = handler(PageTabsQuery, {
	inject: { designReads: DesignReads, canvasStore: CanvasStore },
	run: async (input, { designReads, canvasStore }) => tabsOf(await designReads.read(canvasStore.now().app)),
	watch: (input, { designReads, canvasStore }, changed) => designReads.watch(canvasStore.now().app, changed),
});
```

A query whose data changes outside a command (a file edited on disk, a job finishing) declares `watch`. The app calls it while someone reads the query, once per query key however many read it, and re-reads on `changed()`. **planned**: the same `watch` over the wire as a live subscription (Convex's `useQuery`).

## A module

```ts skip-check
export const canvasModule = module("canvas", {
	runs: "client",
	handlers: [pageTabsHandler, addPhotosHandler, …],
	provide: (parts: CanvasParts) => ({
		...parts,
		canvasStore: new MomentCanvasStore(parts.canvasHost.opened, (kept) => parts.canvasHost.keepOpening(kept)),
		designReads: new CachedDesignReads(parts.designFolder, parts.designJobs, parts.appLook),
	}),
});

export const billingModule = module("billing", {
	runs: "server",
	handlers: [chargeHandler],
	provide: ({ env }) => ({ billingDb: new PostgresBillingDb(env.DATABASE_URL) }),
});
```

- `provide` must return every key its handlers inject, typed by the handlers' `inject`. A client module's `provide` takes the parts its host builds (`canvasModule.with(parts)`); a server module's takes `{ env }`.
- A dependency is an abstract class, and the class is its own token. A starter refuses a provided value that is not an instance of the injected class.
- Swapping an implementation is one line in a host's parts. A test builds `module.with(fakes)`.

## Starting: `app()` and `server()`

```ts skip-check
const canvasApp = app({ modules: [canvasModule.with(parts)], server: env.SERVER_URL, host });
const started = server({ modules: [billingModule], env: process.env, host: { authenticate } });
```

- `app({ modules, server?, host? })` runs every `runs: "client"` module locally and sends every other request to `server`. With no `server`, such a request answers `no-server`.
- `server({ modules, env, host? })` is a Hono app mounting `/rpc/*`; it answers `{ fetch }`. Its host gives `authenticate`, `doneKeys`, `rateLimits`, `reportFailure`.
- A starter refuses, naming the request: a module of the other side, a request handled in a module its name does not name, two handlers for one request, a missing or wrong provided value, a server module's request with no guard, a guard injecting what the request's module does not provide (`guard #1 of pages/rename-elsewhere injects pages, which its module does not provide as a Pages`), a guard that needs a user (`AuthenticatedGuard`, `HasPermissionGuard`) when the host has no `Authenticate`.
- The wire is oRPC v2, and only `core` knows it (`wire.ts`, `wire-client.ts`, `server/`). Nothing in a module imports oRPC; replacing it changes those files. `apps/server` is **planned**.

## Cache and re-read

TanStack Query is the cache under the hooks; a component never touches it. A local query gets no retry and no re-read on focus; a remote one retries an unreachable server and re-reads on focus. After a command that ran, its `invalidates` list, or every query on screen, is read again; a re-read keeps the previous data on screen and every unchanged part by identity.

## Adapters

An outside system is reached through an adapter: an abstract class in `adapters/<area>/<area>.adapter.ts`, one implementation per host beside it.

- **Split by area, not by line count.** The canvas once had one `DesignSource`; it is now `DesignFolder`, `DesignJobs`, `DesignDrawing`, `DesignPhotos`, `DesignLayers`, `AppLook`, and `CanvasHost` (what the mount gives, `returnToView` among it).
- **A handler holds the decision, an adapter only calls its system** (read a file by path, write a file, take a picture). A store owns long-lived state (`CanvasStore`). `DesignReads` is the one cached reader of the design; every handler reads through it.
- Its methods return typed results; each implementation turns its provider's errors into the adapter's refusals.

## Data

**planned.** Tables are Drizzle code in `schema/`; the zod shapes requests use are derived from them. Migrations are generated, never written by hand.

- **Uniqueness is an explicit choice:** `unique: [["userId", "plan"]]` or `unique: "none"`.
- **Two people editing one row:** a `version` column; an update matches `WHERE id = ? AND version = ?`, and zero rows answer "conflict".
- **A done key on a server is an atomic unique insert first**; read-then-write is forbidden.

## Background work and webhooks

**planned.** `cron`, `worker` and `loop` are handlers declared in a module, with idempotency on every job. A webhook lands on a server route, is verified, **stored raw first**, answered `2xx`, then applied by a command keyed by the provider's event id; a periodic job compares our rows with the provider and repairs drift.
