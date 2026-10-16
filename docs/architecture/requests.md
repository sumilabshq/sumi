# Requests

Logic lives only in handlers. A view or another handler reaches logic by sending a request through the mediator. Everything here is exported from `@widgetarium/core/requests`.

Every declaration is a fluent chain ([code-style.md](code-style.md#the-fluent-chain)): one concern per call, read top to bottom in the order it runs, every behaviour ending in `.handle()`.

## A contract

The contract says what may be asked: a name, a shape and the policies of the call itself. It is shared by every side, holds no logic and names no guard. It lives in `features/<feature>/contract.ts`.

```ts skip-check
export const ChargeCommand = command("billing/charge")
	.input(ChargeInputSchema)
	.output(ChargeSchema)
	.idempotencyKey(PerCall);

export const PagesQuery = query("canvas/pages")
	.input(z.object({ app: z.string() }))
	.output(PagesSchema)
	.cache({ freshFor: seconds(30) });
```

| Declaration                                    | On      | Means                                                                         |
| ---------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| `.input(S)`, `.output(S)`                      | both    | zod schemas; omitted means `void`                                             |
| `.idempotencyKey(PerCall \| Repeatable \| fn)` | command | **required**: a command with no key is a type error                           |
| `.cache({ freshFor })`                         | query   | the time an answer stays fresh (TanStack's `staleTime`)                       |
| `.settlesNow()`                                | query   | answered synchronously on its first read of a local module                    |
| `.invalidates([Query, …])`                     | command | the queries re-read after it ran; without it every query on screen is re-read |

- The name `"<module>/<name>"` is the request's address on the wire (`/rpc/billing/charge`), in logs and in done keys. `query()` throws on a name that is not kebab case `<module>/<name>`; lint holds it equal to the domain and the constant without its suffix.
- **Strings only for free-form data** (request names, reasons). Every other choice is a typed value: a guard, a `permission("…")` constant, `PerCall` / `Repeatable`, a `Duration` (`seconds(n)`, `minutes(n)`, `hours(n)`, `duration({ hours: 1, minutes: 5 })`).

## A module

A module says where its handlers run and what they share. `module.ts` holds only its definition, named `<Domain><Side>Module`:

```ts skip-check
export const BillingServerModule = serverModule("billing")
	.guard(AuthenticatedGuard)
	.use(TimingLoggerMiddleware)
	.provide(({ env }) => ({ billingDb: new PostgresBillingDb(env.DATABASE_URL) }));

export const CanvasClientModule = clientModule("canvas").provide((parts: CanvasParts) => ({ ...parts }));
```

- `serverModule(name)` takes `.guard`, `.use` and `.provide(({ env }) => …)`; `clientModule(name)` takes only `.provide((parts) => …)`, the parts its host builds. No string picks a side.
- **Module guards decide identity only** (`PublicGuard`, `AuthenticatedGuard`, `HasPermissionGuard`, a guard that `.needsUser()`); they read no input. Ownership guards stay on the handler.
- `widgetarium generate` writes `generated/module.ts`: the definition joined with every exported `*Handler` of `features/**/handlers.ts`, refusing a handler that names another folder's module. `"./module"` points there.

## A handler

The logic answering one request, in `features/<feature>/handlers.ts`, named for its request: `ChargeCommandHandler`. It names its module, so its side shows in its file. Whole compiling examples of every pattern are in [docs/ai/requests.md](../ai/requests.md).

```ts skip-check
export const ChargeCommandHandler = handler(ChargeCommand, BillingServerModule)
	.guard(OwnsInvoiceGuard)
	.inject({ billingDb: BillingDb })
	.handle((input, { billingDb, idempotencyKey, user, invoice }) =>
		billingDb.insertCharge(input, invoice, user.id, idempotencyKey),
	);
```

**The module decides what the builder offers.** A guarded server module gives `.handle` at once, the context carrying `user: User` and what its guards add. A server module with no guard gives a draft whose `.handle` is not callable until `PublicGuard` or a guard needing a user is added; tsc names the fix: `Add .guard(AuthenticatedGuard) or .guard(PublicGuard) before .handle(), or guard its server module`. A client module gives `.handle` at once and no `.guard`.

- `.guard(G)` is the one access verb: who may call. A guard that only checks the input covers nothing alone; after `PublicGuard` only such guards follow.
- `.use(M)` adds a middleware, which never decides access. Module steps run first, then the handler's, as written, after the input is validated and before the idempotency key and `.handle`.
- `.inject({...})` takes keys the module's `provide` returns, each an abstract class its value is an instance of; anything else is a type error. Guards and middleware add per-call values. Both arrive in the one context of `.handle`, with `idempotencyKey`, `signal` and `user`.
- `.handle(fn)` ends the chain and returns the handler. Types check that it takes the contract's input and returns its output.
- **A test calls it directly:** `await ChargeCommandHandler.handle(input, { billingDb: fakeBillingDb, user, invoice })`.
- In a client module a handler may call another handler of its module that way. **On the server it never does**: `.handle` skips that handler's guards and keys; send the request, or move the shared work to `lib/`. `handler-ownership` warns on `*Handler.handle(` in a server module's handlers.

### Guards and middleware

Both run **only on the server**. Types, then `server()`, refuse a handler that neither `PublicGuard` nor a guard needing a user covers, on its module or itself, naming it.

| Step                                                  | Does                                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `.guard(PublicGuard)`                                 | lets anyone through; only input guards may follow it                                         |
| `.guard(AuthenticatedGuard)`                          | refuses `unauthenticated` with no user; adds `user: User`                                    |
| `.guard(HasPermissionGuard(perm))`                    | refuses a user without the permission                                                        |
| `.guard(guard<In>().inject({…}).handle(check))`       | a project's guard: `deny(reason)` refuses `forbidden`, a returned object adds to the context |
| `guard().needsUser()`                                 | refuses `unauthenticated` with no user before its check, and covers the handler              |
| `.use(rateLimit({ calls, per }))`                     | refuses `rate-limited` past the limit; without one a server runs its own first               |
| `.use(middleware().adds<A>().inject({…}).handle(fn))` | a project's middleware: wraps `next(added?)` and returns its answer                          |

**A step only refuses.** An `ok` answer it did not get from `next()` is refused as `failed` and reported, so a middleware before a guard cannot answer for anyone. A step that throws after `next()` answers `failed` with `ran` taken from what `next()` answered.

A timing middleware wraps the rest of the chain:

```ts skip-check
export const TimingLoggerMiddleware = middleware()
	.inject({ logger: Logger })
	.handle(async ({ request }, { logger }, next) => {
		const startedAt = Date.now();
		const answer = await next();
		logger.timed(request, Date.now() - startedAt);
		return answer;
	});
```

A middleware adds to the context through `next`; what it adds is declared, so the next steps and `.handle` see it typed. It never adds `user`, `idempotencyKey` or `signal`: `.adds<>` refuses them, and a step passing on a different `user` is refused at run time, because the user comes from `Authenticate` alone:

```ts skip-check
export const TenantMiddleware = middleware()
	.adds<{ readonly tenant: Tenant }>()
	.inject({ tenants: Tenants })
	.handle(async ({ context }, { tenants }, next) => next({ tenant: await tenants.of(context.user) }));
```

Ownership is a guard. It resolves the record, checks its owner, refuses with `deny`, and returns the record; the handler reads it from the context, never by the id in the input:

```ts skip-check
export const OwnsInvoiceGuard = guard<{ readonly invoiceId: string }>()
	.inject({ invoices: Invoices })
	.handle(async ({ input, context }, { invoices }) => {
		const invoice = await invoices.byId(input.invoiceId);
		if (invoice === null || invoice.ownerId !== context.user?.id) return deny("not your invoice");
		return { invoice };
	});
```

- `.guard(OwnsInvoiceGuard)` type-checks only on a request whose input has `invoiceId: string`.
- The `handler-ownership` lint warns when a server handler with no resolving guard passes an id-named input field (`id`, `*Id`, `invoice`) to an injected port.
- A step never changes `input`: it is validated, and keys are derived from it.
- **A step gets every dependency through `inject`**, resolved from the module's `provide` (and `rateLimits` from the server's host). A guard imports nothing server-only, and a contract imports no guard, so a client bundle carries none (`test:server` proves it).
- **A guard never holds a secret.** The server host's `Authenticate` (an abstract class, `userOf(headers) → User | null`, exported with `server` from `@widgetarium/core/requests/server`) turns the request's token into `user`; guards read `context.user` and may query more.

### Live data: `watch`

```ts skip-check
export const PageTabsQueryHandler = handler(PageTabsQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore })
	.watch((input, { designReads, canvasStore }, changed) => designReads.watch(canvasStore.now().app, changed))
	.handle(async (input, { designReads, canvasStore }) => tabsOf(await designReads.read(canvasStore.now().app)));
```

A query whose data changes outside a command (a file edited on disk, a job finishing) declares `.watch`. The app calls it while someone reads the query, once per query key however many read it, and re-reads on `changed()`. **planned**: the same `watch` over the wire as a live subscription (Convex's `useQuery`).

## Policy order

Fixed:

```
client: input → idempotency key (minted if PerCall and absent) → in-flight dedup → handle → output
server: input → Authenticate → default rate limit → module guards and middleware → handler guards and middleware, as written → idempotency key → in-flight dedup (per user) → handle → output
```

- **Rate limit:** `SERVER_RATE_LIMIT` (120 calls a minute per request and user) runs before every written step unless one of them is a `rateLimit(...)`, so a flood is refused before a guard reads a database. A client has none. TODO: every anonymous caller shares one bucket per request; keying it by client address through `Authenticate` is open.
- **In-flight dedup:** a second identical query waits for the first and gets its answer. On the server it is keyed by request, input and user and runs after the steps, so one user never receives an answer another was allowed.
- Every refusal reaches the developer once through the host's `reportFailure` (the console by default) and the person once through the app's refusal handler ([views.md](views.md)).

## Idempotency

| Declaration                   | Meaning                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `.idempotencyKey(input => …)` | the same data is the same action: a repeat does nothing and answers the first answer |
| `.idempotencyKey(PerCall)`    | each call is new; the key travels with the call                                      |
| `.idempotencyKey(Repeatable)` | repeats are wanted (a "+1" counter)                                                  |

- **Done keys are scoped per user:** `${request}:${user.id ?? "anonymous"}:${key}` (Stripe scopes keys per account); on a client `user` is always anonymous. A second call with a key still running waits for the first and gets its answer.
- **On a server an anonymous caller's key made from the input is never replayed** and never joins a call in flight: two strangers sending the same data would get each other's answer. A `PerCall` key is still replayed, because it cannot be guessed.
- **Uniqueness across users** (two admins paying one invoice) is not an idempotency key's job: it is a database constraint (see Data).
- **`PerCall` keys:** the client mediator mints one for a call sent with none; `useCommand` keeps one key per call so only a retry of that same call reuses it. A server refuses a `PerCall` call that arrives with no key (`missing-key`).
- The handler receives `idempotencyKey` and hands it on to a provider that supports one (Stripe).
- `DoneKeys` is abstract. `MemoryDoneKeys` keeps the last 1000 and evicts only settled answers, never a pending claim. TODO: a durable store with pending-with-expiry for a server with more than one process.
- An idempotency key stops **the same call** twice. Two different calls that would leave broken data are stopped by the database (see Data).

## `ran`

Every answer is `{ ok: true, output }` or `{ ok: false, code, reason, ran }`.

- A command whose handler throws answers `ran: true`: the write may have happened, so it is never retried and its done key stays.
- A handler that refuses **before** writing calls `refuse(reason)` (it throws `Refused`); the answer is `{ ok: false, code: "refused", ran: false }` and the done key is released, so a corrected call may run.

## Providing

- `provide` returns the module's dependencies; a handler's `.inject` is typed against it. A client module's `provide` takes the parts its host builds (`CanvasClientModule.with(parts)`); a server module's takes `{ env }`.
- A dependency is an abstract class, and the class is its own token. A starter refuses a provided value that is not an instance of the injected class.
- Swapping an implementation is one line in a host's parts. A test builds `module.handlers([...]).with(fakes)`.

## Starting: `app()` and `server()`

```ts skip-check
const canvasApp = app({ modules: [CanvasClientModule.with(parts)], server: env.SERVER_URL, host });
const started = server({ modules: [BillingServerModule], env: process.env, host: { authenticate } });
```

Both import the assembled module from `<package>/module`.

- `app({ modules, server?, host? })` runs every client module locally and sends every other request to `server`. With no `server`, such a request answers `no-server`.
- `server({ modules, env, host? })` is a Hono app mounting `WIRE_PREFIX` (`/rpc`, exported from `@widgetarium/core/requests/server`); it answers `{ fetch }`. Its host gives `authenticate`, `doneKeys`, `rateLimits`, `reportFailure`.
- A starter refuses, naming the request: a module of the other side, a request handled in a module its name does not name, a handler built for another module, two handlers for one request, a missing or wrong provided value, a module providing a key its host provides (`rateLimits`), a server handler no guard covers, a step injecting what the module does not provide (`guard #2 of pages/rename-elsewhere injects pages, which its module does not provide as a Pages`), a guard that needs a user when the host has no `Authenticate`.
- The wire is oRPC v2, and only `core` knows it (`wire.ts`, `wire-client.ts`, `server/`). Nothing in a module imports oRPC; replacing it changes those files. `apps/server` serves it ([hosts.md](hosts.md#deploy)).

## Cache and re-read

TanStack Query is the cache under the hooks; a component never touches it. A local query gets no retry and no re-read on focus; a remote one retries an unreachable server and re-reads on focus. After a command that ran, its `invalidates` list, or every query on screen, is read again; a re-read keeps the previous data on screen and every unchanged part by identity.

## Gateways

Data or an outside system is reached through a gateway: an abstract class in `gateways/<gateway>/<gateway>.gateway.ts`, one `<platform>.gateway.ts` per platform beside it (`ObsidianDesignFilesGateway`, `WebDesignFilesGateway`).

- **Split by area, not by line count.** The canvas once had one `DesignSource`; it is now `DesignFolderGateway`, `AgentJobsGateway`, `WidgetDrawingGateway`, `DesignFilesGateway`, and `CanvasHost` (what the mount gives, `returnToView` among it). One gateway per system: reading and writing design files is one `DesignFilesGateway`, whoever the caller.
- **One shape per gateway.** The assistant's jobs are an `AgentJobsGateway`; a second interface with the same verbs under other names is a wrapper to delete.
- **A handler holds the decision, a gateway only calls its system** (read a file by path, write a file, take a picture). A store owns long-lived state (`CanvasStore`) and keeps its invariants in its own writer. `DesignReads` is the one cached reader of the design; every handler reads through it.
- Its methods return typed results; each implementation turns its provider's errors into the gateway's refusals.

## Data

**planned.** Tables are Drizzle code in `schema/`; the zod shapes requests use are derived from them. Migrations are generated, never written by hand.

- **Uniqueness is an explicit choice:** `unique: [["userId", "plan"]]` or `unique: "none"`.
- **Two people editing one row:** a `version` column; an update matches `WHERE id = ? AND version = ?`, and zero rows answer "conflict".
- **A done key on a server is an atomic unique insert first**; read-then-write is forbidden.

## Background work and webhooks

**planned.** `cron`, `worker` and `loop` are handlers declared in a module, with idempotency on every job. A webhook lands on a server route, is verified, **stored raw first**, answered `2xx`, then applied by a command keyed by the provider's event id; a periodic job compares our rows with the provider and repairs drift.
