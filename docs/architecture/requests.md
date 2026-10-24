# Requests

Logic lives only in handlers. A view or another module reaches logic by sending a request through the mediator. Everything here is exported from `@widgetarium/core/requests`. Who may do what inside a handler, a gateway and lib is [layers.md](layers.md).

## A request handles itself

A request and its handler are one chain in `features/<feature>/requests.ts`. The chain up to the first `.inject`, `.guard`, `.use`, `.watch`, `.sends` or `.handle` is the **contract**; the rest is the **handling**.

```ts skip-check
export const FrameSidesQuery = query("frame-sides")
	.output(FrameSidesSchema)
	.settlesNow()
	.inject({ frameSides: FrameSidesGateway })
	.watch((_input, { frameSides }, changed) => frameSides.sidesChanged(changed))
	.handle((_input, { frameSides }) => frameSides.sides());

export const ToggleFrameSideCommand = command("toggle-frame-side")
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.invalidates([FrameSidesQuery])
	.inject({ frameSides: FrameSidesGateway })
	.handle(({ side }, { frameSides }) => {
		const sides = frameSides.sides();
		const was = sides[side];
		const next = toggledLook(was);
		const refusal = refuseTurn(was, next);

		if (refusal !== null) {
			return refuse(`frame side ${side} ${refusal} (toggle)`);
		}

		const reason = `frame side ${side} ${was} → ${next} (toggle)`;
		frameSides.saveSides({ ...sides, [side]: next }, reason);
		console.info(`[widgetarium] ${reason}`);
	});
```

### The contract

| Declaration                                    | On      | Means                                                                         |
| ---------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| `query("<short>")`, `command("<short>")`       | both    | the short kebab name: the constant without its suffix                         |
| `.input(S)`, `.output(S)`                      | both    | zod schemas from `shared/schema`; omitted means `void`                        |
| `.idempotencyKey(PerCall \| Repeatable \| fn)` | command | **required**: a command with no key is a type error                           |
| `.cache({ freshFor })`                         | query   | the time an answer stays fresh (TanStack's `staleTime`)                       |
| `.settlesNow()`                                | query   | answered synchronously on its first read of a local module                    |
| `.invalidates([Query, …])`                     | command | the queries re-read after it ran; without it every query on screen is re-read |

**Strings only for free-form data** (request names, reasons). Every other choice is a typed value: a guard, a `permission("…")` constant, `PerCall` / `Repeatable`, a `Duration` (`seconds(n)`, `minutes(n)`, `hours(n)`).

### The handling

| Step                   | Means                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `.inject({ key: C })`  | what the handler needs, each an abstract class; the module's `provide` must return it     |
| `.guard(G)`, `.use(M)` | who may call, and what wraps the call ([Guards and middleware](#guards-and-middleware))   |
| `.watch(fn)`           | a query whose data changes outside a command ([Live data](#live-data-watch))              |
| `.sends(Other.X, …)`   | the other modules' requests this handler may send ([Sending](#sending-to-another-module)) |
| `.handle(fn)`          | ends the chain; typed to take the contract's input and return its output                  |

`.handle` receives `(input, context)`; the context holds the injected keys, what guards and middleware added, `idempotencyKey`, `signal`, `user`, and `send` when the request declared `.sends`. A handler that refuses before writing calls `refuse(reason)` ([ran](#ran)).

## A module

A module says where it may run, which of its commands and queries others may use, and picks its gateways. `module.ts` holds only this:

```ts skip-check
export const LayoutModule = module("layout")
	.on(Device)
	.public(FrameSidesQuery, ToggleFrameSideCommand, /* … */ DropGoneTabsCommand)
	.provide((facts) => ({ ...layoutPartsOn(facts) }));

export const BillingModule = module("billing")
	.on(Server)
	.imports(UsersModule)
	.public(InvoicesQuery, ChargeCommand)
	.serverOnly(CreateCustomerCommand)
	.provide((facts) => billingPartsOn(facts));
```

- **Order:** `module(name).on(Server | Device | Anywhere)` first, then `.imports`, `.public`, `.serverOnly`, `.guard`, `.use`, then `.provide` last. `.public` before `.on` is a type error; `.serverOnly` on a `Device` module fails with the message "serverOnly needs .on(Server) or .on(Anywhere)".
- **Two lists, no duplicates:** every request stands in exactly one of `.public` (any caller: views, other modules, the network) and `.serverOnly` (never over the network: other server modules in the process when it runs on a server; only its own handlers when an `Anywhere` module runs on a device). Queries and commands are listed together. A request named twice is refused when the module is defined.
- **Stamping:** listing a request renames it `<module>/<short>` (`layout/toggle-frame-side`), its `invalidates` and `sends` lists too. That full name is its address on the wire, in logs and in done keys; the generated contract carries it.
- **`.provide((facts) => parts)`** receives `{ platform, scope, env }`: `platform` is `"tauri" | "browser" | "server"`, `scope.workspaceId` the workspace (the app id on the web), `env` the variables. The module picks its implementations from them in `gateways/<module>-parts/` (`layoutPartsOn`, one entry per platform). It is typed against every listed request's `.inject`: a missing or wrongly typed part is a type error.
- **A test hands fakes:** `LayoutModule.with(parts)` skips `provide`; `app().modules(LayoutModule.with(fakes)).start({ platform, scope }).send(Request, input)` runs the real handlers over them (`tools/layout-rules-checks.ts`).

## Sending to another module

```ts skip-check
import { ChargeCommand } from "@widgetarium/billing";
import { CreateCustomerCommand } from "@widgetarium/billing/server";

export const BuyCommand = command("buy")
	.input(BuyInputSchema)
	.idempotencyKey(Repeatable)
	.sends(ChargeCommand)
	.handle(async ({ cents }, { send }) => send(ChargeCommand, { cents }));
```

- The sending module names the other in `.imports(BillingModule)`; the request names what it sends in `.sends(...)`, which types `send`. A send to a module not in `.imports` is refused at start.
- Public requests come from the other module's `"."` entry, server-only ones from `"./server"`, and only a module `.on(Server)` may send a server-only request (refused at start otherwise). Never import its `module.ts`, handler or gateway.
- `send` routes in process when the other module runs in the same app, else over the network to the address the app imported it at.
- A refusal before the other side wrote refuses the sender; a failure after it fails the sender with `ran: true`.
- A starter refuses a module whose declared send has no module and no server to reach.

## The generated contract

`npm run generate` reads each `module.ts`, finds the listed requests and writes `generated/contract.ts`: each public chain up to its first handling step, with every schema it uses copied in, transitively, ordered so a referenced request comes first, and the module's descriptor (`export const BillingModule = moduleContract("billing", Server, [...])`), which `.imports(BillingModule.at(url))` takes and which carries no code. When the module has server-only requests it also writes `generated/server.ts` with them. The root `index.ts` re-exports the contract (`"."`), the root `server.ts` the server-only one (`"./server"`); a public contract naming a server-only request is refused.

- The contract imports only `zod` and `@widgetarium/core/requests`, so no handler or gateway can reach a client.
- A copied schema is built only from `z.*` calls, literals, object and array literals, other copied schemas and `z.lazy(() => X)`. A function, a helper call or a foreign import is refused by name: a refinement belongs to the handler or beside the gateway (`KeptPaneTreeSchema`).
- Refused: a request not listed by name, listed twice, not imported, a schema declared beside the request instead of in `shared/schema`, a cycle.
- A function idempotency key is copied only when it is one arrow reading its input: `(input) => input.id`, or a template literal of its fields.
- `npm run generate -- --check` (in `test:generated`) fails on a stale file.

The mediator routes by request name, so the generated contract and the request that handles itself meet without sharing an object.

## Guards and middleware

A module's `.guard()` and `.use()` run before every listed request, on either side; a request's own run after them, as written, after the input is validated and before the idempotency key and `.handle`. `app()` refuses at start a step that needs a user, since a client has no `Authenticate`, and a step injecting what the module does not provide. `server()` refuses a request no guard covers, on its module or itself.

| Step                                                  | Does                                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `.guard(PublicGuard)`                                 | lets anyone through; only input guards may follow it                                         |
| `.guard(AuthenticatedGuard)`                          | refuses `unauthenticated` with no user; adds `user: User`                                    |
| `.guard(HasPermissionGuard(perm))`                    | refuses a user without the permission                                                        |
| `.guard(guard<In>().inject({…}).handle(check))`       | a project's guard: `deny(reason)` refuses `forbidden`, a returned object adds to the context |
| `guard().needsUser()`                                 | refuses `unauthenticated` with no user before its check, and covers the request              |
| `.use(rateLimit({ calls, per }))`                     | refuses `rate-limited` past the limit; without one a server runs its own first               |
| `.use(middleware().adds<A>().inject({…}).handle(fn))` | a project's middleware: wraps `next(added?)` and returns its answer                          |

- **Module guards decide identity only** (`PublicGuard`, `AuthenticatedGuard`, `HasPermissionGuard`); they read no input. Ownership is a request's own guard: it resolves the record, checks its owner, refuses with `deny`, and returns the record for the handler to read from the context.
- **A step only refuses.** An `ok` answer it did not get from `next()` is refused as `failed`, so a middleware before a guard cannot answer for anyone.
- A middleware never adds `user`, `idempotencyKey` or `signal`: the user comes from the server host's `Authenticate` alone (`userOf(headers) → User | null`). A guard never holds a secret and never verifies a token.
- A step never changes `input`, and gets every dependency through `.inject`, resolved from the module's `provide`.

```ts skip-check
export const OwnsInvoiceGuard = guard<{ readonly invoiceId: string }>()
	.inject({ invoices: InvoicesGateway })
	.handle(async ({ input, context }, { invoices }) => {
		const invoice = await invoices.invoice(input.invoiceId);
		if (invoice === null || invoice.ownerId !== context.user?.id) return deny("not your invoice");
		return { invoice };
	});
```

## Live data: `watch`

A query whose data changes outside a command (a file edited on disk, another window writing the same setting) declares `.watch((input, injected, changed) => unsubscribe)`. The app calls it while someone reads the query, once per query key however many read it, and re-reads on `changed()`. The gateway offers the listener as an operation named for its data (`sidesChanged`). **planned**: the same `watch` over the wire as a live subscription.

## Policy order

```
client: input → module steps → request steps → idempotency key (minted if PerCall and absent) → in-flight dedup → handle → output
server: input → Authenticate → default rate limit → module steps → request steps → idempotency key → in-flight dedup (per user) → handle → output
```

- **Rate limit:** `SERVER_RATE_LIMIT` (120 calls a minute per request and user) runs before every written step unless one of them is a `rateLimit(...)`. TODO: anonymous callers share one bucket per request.
- **In-flight dedup:** a second identical query waits for the first. On the server it is keyed by request, input and user.
- Every refusal reaches the developer once through the host's `reportFailure` (the console by default) and the person once through the app's refusal handler ([views.md](views.md)).

## Idempotency

| Declaration                   | Meaning                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `.idempotencyKey(input => …)` | the same data is the same action: a repeat does nothing and answers the first answer |
| `.idempotencyKey(PerCall)`    | each call is new; the key travels with the call                                      |
| `.idempotencyKey(Repeatable)` | repeats are wanted (a toggle, a "+1" counter)                                        |

- **Done keys are scoped per user:** `${request}:${user.id ?? "anonymous"}:${key}`. A second call with a key still running waits for the first.
- **On a server an anonymous caller's key made from the input is never replayed**: two strangers sending the same data would get each other's answer. A `PerCall` key still is.
- **`PerCall` keys:** the client mediator mints one for a call sent with none; `useCommand` keeps one per call so only a retry reuses it. A server refuses a `PerCall` call with no key (`missing-key`).
- The handler receives `idempotencyKey` and hands it on to a provider that supports one (Stripe).
- `MemoryDoneKeys` keeps the last 1000 and evicts only settled answers. TODO: a durable store for a server with more than one process.
- Uniqueness across users is not a key's job: it is a database constraint (see Data).

## `ran`

Every answer is `{ ok: true, output }` or `{ ok: false, code, reason, ran }`.

- A command whose handler throws answers `ran: true`: the write may have happened, so it is never retried and its done key stays.
- A handler that refuses **before** writing calls `refuse(reason)`; the answer is `{ ok: false, code: "refused", ran: false }` and the done key is released.

## Starting: `app()` and `server()`

An app is shaped like a module: `.modules(...)` run in it, `.imports(...)` are reached at an address.

```ts skip-check
const layoutApp = app()
	.modules(LayoutModule)
	.imports(BillingModule.at(env.API_URL))
	.start({ platform: "tauri", scope: { workspaceId } });

const served = server().modules(BillingModule, UsersModule).start({ env: process.env, host: { authenticate } });
```

- `.modules(...)` take the runnable module from `<package>/module`: an app takes `Device` and `Anywhere` modules, a server `Server` and `Anywhere` ones (a type error otherwise, and refused at start).
- `.imports(...)` take only `Server` modules, by the descriptor in their `"."` entry, at an address: `.at(url)` is required and exists only on a `Server` module. No server code reaches the bundle.
- Every module's `.imports` must be met by the app's `.modules` or `.imports`; start refuses naming the missing module.
- `.start({ platform, scope, env?, host? })` answers the started app; a server's `.start({ env, scope?, host? })` answers `{ fetch }`.
- **One app per set of modules.** Views and adapters share it: `apps/studio/src/tabs/layout-app.ts` starts the layout once, and `AppProvider` and every adapter over it use that one (`layoutApp.send`, `layoutApp.routes`).
- A server is a Hono app mounting `/rpc`. Over the network it answers only `.public` requests: a server-only one answers `404`, while an in-process `send` from another server module reaches it. Its host gives `authenticate`, `doneKeys`, `rateLimits`, `reportFailure`.
- A starter refuses, naming the request: two handlers for one request, a missing or wrong provided value, a step injecting what the module does not provide, a server request no guard covers, a guard that needs a user when the host has no `Authenticate`, a declared send nothing can answer.
- The wire is oRPC, and only `core` knows it (`wire.ts`, `wire-client.ts`, `server/`). `apps/server` serves it ([hosts.md](hosts.md#deploy)).

## Cache and re-read

TanStack Query is the cache under the hooks; a component never touches it. A local query gets no retry and no re-read on focus; a remote one retries an unreachable server and re-reads on focus. After a command that ran, its `invalidates` list, or every query on screen, is read again; a re-read keeps the previous data on screen and every unchanged part by identity.

## Data

**planned.** Tables are Drizzle code in `shared/schema/`; the zod shapes requests use are derived from them. Migrations are generated, never written by hand.

- **Uniqueness is an explicit choice:** `unique: [["userId", "plan"]]` or `unique: "none"`.
- **Two people editing one row:** a `version` column; an update matches `WHERE id = ? AND version = ?`, and zero rows answer "conflict".
- **A done key on a server is an atomic unique insert first**; read-then-write is forbidden.

## Background work and webhooks

**planned.** `cron`, `worker` and `loop` are handlers declared in a module, with idempotency on every job. A webhook lands on a server route, is verified, **stored raw first**, answered `2xx`, then applied by a command keyed by the provider's event id; a periodic job compares our rows with the provider and repairs drift.
