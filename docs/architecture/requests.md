# Requests

Logic lives only in handlers. A view or another module reaches logic by sending a request through the mediator. Everything here is exported from `@widgetarium/data-framework`. Who may do what inside a handler, a gateway and lib is [layers.md](layers.md).

## A request handles itself

A request and its handler are one chain in `features/<feature>/requests.ts`, built with `command`, `query` and `subscriber` from `#module` (the package's `generated/command.ts`). The chain up to the first `.guard`, `.use` or `.handle` is the **contract**; the rest is the **handling**.

```ts skip-check
import { command, query } from "#module";

export const FrameSidesQuery = query("frame-sides")
	.public()
	.output(FrameSidesSchema)
	.settlesNow()
	.handle((_input, { frameSides }) => frameSides.sides());

export const ToggleFrameSideCommand = command("toggle-frame-side")
	.public()
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.handle(({ side }, { frameSides, invalidate }) => {
		invalidate(FrameSidesQuery);
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

| Declaration                                    | On      | Means                                                       |
| ---------------------------------------------- | ------- | ----------------------------------------------------------- |
| `query("<short>")`, `command("<short>")`       | both    | the short kebab name: the constant without its suffix       |
| no mark                                        | both    | callable only in the same process: any module or view there |
| `.public()`                                    | both    | callable by anyone, through guards; enters the contract     |
| `.callableBy(OtherModule, …)`                  | both    | callable only by those services                             |
| `.input(S)`, `.output(S)`                      | both    | zod schemas from `shared/schema`; omitted means `void`      |
| `.idempotencyKey(PerCall \| Repeatable \| fn)` | command | **required**: a command with no key is a type error         |
| `.cache({ freshFor })`                         | query   | the time an answer stays fresh (TanStack's `staleTime`)     |
| `.settlesNow()`                                | query   | answered synchronously on its first read of a local module  |

**Visibility is one check, and it fails closed.** The mediator runs `refuseCaller` (`local-routes.ts`) before it parses the input. A call counts as from outside unless its in-process sender marks it: a handler's or subscriber's `send` names its module, the runtime's own views send as a view. Every served call (HTTP, `MessagePort`, the studio's IPC relay) is outside. Outside, only `.public()` passes; anything else answers `not-found` with one message, whatever the request's visibility. In the process, `.callableBy(...)` lets only its own module and the listed modules through (a view is refused `forbidden`). `.callableBy` stays refused over a transport until modules have an identity there. `.public()` and `.callableBy()` on one request throw.

**Strings only for free-form data** (request names, reasons). Every other choice is a typed value: a guard, a `permission("…")` constant, `PerCall` / `Repeatable`, a `Duration` (`seconds(n)`, `minutes(n)`, `hours(n)`).

### The handling

| Step                   | Means                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `.guard(G)`, `.use(M)` | who may call, and what wraps the call ([Guards and middleware](#guards-and-middleware)) |
| `.handle(fn)`          | ends the chain; typed to take the contract's input and return its output                |

`.handle` receives `(input, context)`; the context holds what the module's `provide` returns (keys are the gateway names, `questions: QuestionsGateway`; named `injects` when not destructured), what the runtime provides ([Runtime provides](#runtime-provides)), what guards and middleware added, `idempotencyKey`, `signal`, `user`, `send` ([Sending](#sending-to-another-module)), and, in a command, `invalidate` ([Re-reading](#re-reading-invalidate)) and `emit` ([Events](#events-and-subscribers)). `send`, `invalidate` and `emit` are never declared: the engine passes them to every handler and subscriber. Their names and the other context names (`idempotencyKey`, `signal`, `user`) are reserved: a module providing one is refused at start. A handler that refuses before writing calls `refuse(reason)` ([ran](#ran)).

## Re-reading: `invalidate`

A command or a subscriber calls `invalidate(Query, input?)` for each query its work made stale: the own module's queries, or those of a module in `.imports` (anything else fails the call, naming the fix). With an input, only that read re-reads; without one, every read of the query. Prior art: `revalidatePath` / `revalidateTag` in Next.js server actions, `invalidateQueries` in TanStack's `onSuccess`.

- Invalidations are collected during the call and applied only after a successful answer; a refused, thrown or failed call applies none. A subscriber's apply after it returns without throwing.
- No default: a command that invalidates nothing re-reads nothing. A query has no `invalidate`.
- Over the network the names ride in the answer body (`invalidated: [...]`) and the client engine re-reads them. A change on the server that no call of this client caused (another user, a cron, a webhook) reaches every other client through its transport's `changes`: the server tells each listener and the SSE stream every invalidation, its own calls' and its subscribers' alike. Events over the wire are still **planned**.
- A command sending another command adds what that one invalidated to its own answer.

## Events and subscribers

An event is a fact in the past tense with an input schema, and it lives only inside modules:

```ts skip-check
export const PanesChangedEvent = event("panes-changed")
	.public()
	.from(gatewayEvent(PaneTreeGateway, (gateway, fire) => gateway.treeChanged(fire)));

export const RereadPanesSubscriber = subscriber(PanesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(PaneTreeQuery);
	invalidate(PlacementPreviewQuery);
});
```

- **Two sources.** A command or a subscriber emits it with `emit(Event, input)`, which returns nothing to await, or it comes from outside with `.from(...)`: one source for every platform, or a record keyed by platform (a missing platform never fires). Sources: `gatewayEvent(Gateway, (gateway, fire) => gateway.xChanged(fire))` for a gateway's own listener in the process (a signal only the host has, such as Tauri's, reaches a module this way: the host lends an object, a gateway wraps it), `windowEvent(type)` (`window.addEventListener`, the payload of a `MessageEvent` or `CustomEvent`). A payload the event's schema refuses is reported and dropped, never delivered.
- **`.public()` enters the contract.** An event belongs to the module whose package declares it. Marked `event("x").public()`, it enters the generated contract; unmarked, any module that imports its module still hears it in process. **A module emits only its own events, with no declaration.** `emit` is typed by the events of its package (the generator lists them in `generated/command.ts`), so emitting another module's event is a type error; at run time `emit` refuses it too, naming the emitter, the event and the module. A query has no `emit`. The app starts a source only while some subscriber listens, and stops it with `stop()`.
- **Subscribers.** `subscriber(Event).handle((input, { invalidate, send, emit, ...injects }) => ...)`, from `#module`: what the module reacts to; many per event are normal. The generator puts every subscriber of the package in `handled`. A subscriber is named for what it does (`RereadPanesSubscriber`, `EnsurePanePagesSubscriber`), never for its trigger. A subscriber of another module's event needs that module in `.imports()`, or the start is refused naming the fix; events do not cross the network yet, so an event of a module imported from an address is refused at start.
- **After the answer, each on its own.** Subscribers run after the emitting handler has answered (scheduled, never inline); one throwing or rejecting is reported once and touches neither the emitter nor the other subscribers.
- **Views never touch events.** A view reads with `useQuery` and acts with `useCommand`; events are inside modules: subscribers handle them and call `invalidate` to re-read queries. A view never emits or subscribes to an event.
- **Where it lives.** An event a gateway is the source of lives beside it, `gateways/<gateway>/<gateway>.events.ts`; an emitted event in the feature that emits it, or `shared/events/<topic>.events.ts` when two features use it.

## A module's config

A module that needs live objects only its starter has (a store, a file it opened, a running agent) declares their shape with `.config<C>()`, and the module becomes callable: whoever starts it passes its config where it lists it, `TasksModule({ file })`, and `provide(({ platform, scope, env, config }) => ...)` receives it. The config is the module's own: no other module sees it. A config with a required field makes the uncalled module a type error in `.modules(...)`; a config whose fields are all optional lets the module stand uncalled, with an empty config. `XModule({ injects: fakes })` skips config and `provide` alike. The starter passes raw objects only, never a module's gateway; the module builds its gateways on them. The config's types live in the module's `shared/host/<x>.host.ts`, and `module.ts` re-exports them as types.

```ts skip-check
export const TasksModule = module("tasks")
	.on(Server)
	.config<{ readonly file: BoardFile }>()
	.provide(({ config }) => tasksPartsOn(config))
	.handles(...handled);
runtime().modules(TasksModule({ file })).start({ platform: "server", env, scope });
```

**A module mounted several ways takes a union with `kind`.** The starter names the variant, and `provide` branches on it:

```ts skip-check
module("canvas")
	.on(Device)
	.config<
		| { readonly kind: "vault"; readonly adapter: DataAdapter }
		| { readonly kind: "project"; readonly project: StartedProject }
	>()
	.provide(({ config }) => (config.kind === "vault" ? vaultParts(config.adapter) : projectParts(config.project)))
	.handles(...handled);
CanvasModule({ kind: "project", project });
```

**Objects only one host has go in an optional field.** `LayoutModule` takes `{ tauri?: { store, windows } }`: the Tauri host calls `LayoutModule({ tauri: { store, windows } })`, every other starter lists `LayoutModule` uncalled, and `provide` picks its Tauri parts only when `config.tauri` is there.

## A module

A module says where it may run, what it imports and guards, and picks its gateways. It never lists its requests. `module.ts` holds only this (`plugins/chat/data/questions/module.ts`, `packages/state/layout/module.ts`):

```ts skip-check
import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { questionsPartsOn } from "./gateways/questions-parts/questions-parts.gateway.js";
import { handled } from "./generated/handled.js";

export const QuestionsModule = module("questions")
	.on(Server)
	.guard(PublicGuard)
	.provide((facts) => questionsPartsOn(facts))
	.handles(...handled);
```

- **Order:** `module(name).on(Server | Device | Anywhere)` first, then `.imports`, `.config`, `.guard`, `.use`, `.provide`, and `.handles(...handled)` last.
- **The generator lists.** `widgetarium generate` scans `features/**/requests.ts(x)`, `gateways/**/*.events.ts` and `shared/events/*.events.ts` and writes `generated/handled.ts` (`export const handled: readonly ModuleItem[] = [...]`): every request with a handler, every event, every subscriber. A name declared in two files is refused.
- **Builders from `#module`.** `generated/command.ts` holds `export const { command, query, subscriber } = buildersOf<typeof QuestionsModule, typeof AskedEvent | …>();`, the second argument every event of the package (`never` with none); `package.json` maps `"imports": { "#module": … }` to it. `event` comes from `@widgetarium/data-framework`. A handler's second parameter is typed by what `provide` and the runtime return, so a request has no `.inject`: using a key neither returns is a type error.
- **Stamping:** handling a request renames it `<module>/<short>` (`layout/toggle-frame-side`), its events and the events its own subscribers hear too. That full name is its address on the wire, in logs and in done keys; the generated contract carries it.
- **`.provide((facts) => injects)`** receives `{ platform, scope, env, config }`: `platform` is `"tauri" | "browser" | "server"`, `scope.workspaceId` the workspace (the app id on the web), `env` the variables, `config` what the module was called with. The module picks its implementations from them in `gateways/<module>-parts/` (`layoutPartsOn`, one entry per platform), keyed by gateway name.
- **A test hands fakes:** `LayoutModule({ injects: fakes })` skips `provide`; `runtime().modules(LayoutModule({ injects: fakes })).start({ platform, scope }).send(Request, input)` runs the real handlers over them (`tools/command-menu-checks.ts`).

## Sending to another module

```ts skip-check
import { ChargeCommand } from "@widgetarium/billing";
import { CreateCustomerCommand } from "@widgetarium/billing/server";
import { command } from "#module";

export const BuyCommand = command("buy")
	.input(BuyInputSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ cents }, { send }) => send(ChargeCommand, { cents }));
```

- `send` is in every handler's and subscriber's context and takes any request, typed by that request's input and output. Nothing lists what a handler sends: prior art is MediatR's `ISender.Send` and NestJS's `CommandBus.execute`.
- The sending module names the other in `.imports(BillingModule)`. A send to a module not in `.imports` fails at the send, naming the fix (`shop/buy sends payments/charge, but module "shop" does not import payments: add .imports()`); a request of the own module needs no import.
- `.public()` requests come from the other module's `"."` entry; the non-public requests of a `Server` or `Anywhere` module from its `"./server"`, for other server modules in the same process. A non-public request sent at an imported address is refused by the server that serves it (`refuseCaller`). Never import its `module.ts`, handler or gateway.
- `send` routes in process when the other module runs in the same app, else over the network to the address the app imported it at. A request no module runs and no server reaches answers `no-server`, and the sender fails with it.
- A refusal before the other side wrote refuses the sender; a failure after it fails the sender with `ran: true`.

## The generated contract

`npm run generate` scans each data module's requests and events and writes, per package: `generated/handled.ts` and `generated/command.ts` ([A module](#a-module)); `generated/contract.ts`: each `.public()` request and event up to its first handling step, `.public()` / `.callableBy()` cut out (an event's `.from(...)` is cut too, so no source reaches a client), with every schema it uses copied in, transitively, and the module's descriptor (`export const BillingModule = moduleContract("billing", Server, [...])`), which `.imports(BillingModule({ over: transport }))` takes and which carries no code; and, for a `Server` or `Anywhere` module with non-public requests, `generated/server.ts` with them. The root `index.ts` re-exports the contract (`"."`), the root `server.ts` the server one (`"./server"`). The contract carries no invalidation. A contract is callable; `isModuleContract(value)` tells one apart.

- The contract imports only `zod` and `@widgetarium/data-framework`, so no handler or gateway can reach a client.
- A copied schema is built only from `z.*` calls, literals, object and array literals, other copied schemas and `z.lazy(() => X)`. A function, a helper call or a foreign import is refused by name: a refinement belongs to the handler or beside the gateway (`KeptPaneTreeSchema`).
- Refused: a `module.ts` not ending in `.handles(...handled)` imported from `"./generated/handled.js"`; a `package.json` without the `#module` import; a `"./server"` export with no non-public request, or non-public requests with no `"./server"` export; a name declared twice; a schema declared beside the request instead of in `shared/schema`; a cycle.
- A function idempotency key is copied only when it is one arrow reading its input: `(input) => input.id`, or a template literal of its fields.
- `npm run generate -- --check` (in `test:generated`) fails on a stale file.

The mediator routes by request name, so the generated contract and the request that handles itself meet without sharing an object.

## Guards and middleware

A module's `.guard()` and `.use()` run before every request it handles, in any runtime; a request's own run after them, as written, after the input is validated and before the idempotency key and `.handle`. `runtime()` refuses at start a step requiring what neither its module nor the runtime provides. An adapter refuses to mount, naming each request, a public request no guard covers (on its module or itself) and, when it has no `Authenticate`, a step that needs a user; a runtime nobody exposes needs no guard.

| Step                                                    | Does                                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `.guard(PublicGuard)`                                   | lets anyone through; only input guards may follow it                                         |
| `.guard(AuthenticatedGuard)`                            | refuses `unauthenticated` with no user; adds `user: User`                                    |
| `.guard(HasPermissionGuard(perm, …))`                   | refuses a user missing any of the permissions, naming it                                     |
| `.guard(guard<In>().requires({…}).handle(check))`       | a project's guard: `deny(reason)` refuses `forbidden`, a returned object adds to the context |
| `guard().needsUser()`                                   | refuses `unauthenticated` with no user before its check, and covers the request              |
| `.use(RateLimitMiddleware({ calls, per }))`             | refuses `rate-limited` past the limit; nothing is limited without one                        |
| `.use(middleware().adds<A>().requires({…}).handle(fn))` | a project's middleware: wraps `next(added?)` and returns its answer                          |

**`.guard` decides who may call: the same answer every time for the same user and input. Everything else, a limit or a counter included, is `.use`.**

**A step that takes options declares them and is called with them where it is used.** `.options<[…]>()` lists them as a function's parameters; the handler reads them as `options`. A step's dependencies stay in its `.requires` and come from the module's `provide` or the runtime's, never from the call.

```ts skip-check
export const RateLimitMiddleware = middleware()
	.options<[limit: RateLimit]>()
	.requires({ rateLimits: RateLimits })
	.handle(async ({ request, context, options: [limit] }, { rateLimits }, next) => …);

command("charge")
	.idempotencyKey(PerCall)
	.guard(HasPermissionGuard(BillingPermissions.charge, BillingPermissions.refund))
	.use(RateLimitMiddleware({ calls: 5, per: minutes(1) }))
	.handle(…);
```

| Options                  | `.use(Step)` | `.use(Step(…))` |
| ------------------------ | ------------ | --------------- |
| none declared            | ✓            | type error      |
| every parameter optional | ✓            | ✓               |
| a required parameter     | type error   | ✓               |

A step needing options passed bare answers the type `"this step takes options: call it with them first, …"`, so the next call in the chain names the fix.

- **Module guards decide identity only** (`PublicGuard`, `AuthenticatedGuard`, `HasPermissionGuard`); they read no input. Ownership is a request's own guard: it resolves the record, checks its owner, refuses with `deny`, and returns the record for the handler to read from the context.
- **A step only refuses.** An `ok` answer it did not get from `next()` is refused as `failed`, so a middleware before a guard cannot answer for anyone.
- A middleware never adds `user`, `idempotencyKey` or `signal`: the user comes from the exposing adapter's `Authenticate` alone (`userOf(headers) → User | null`). A guard never holds a secret and never verifies a token.
- A step never changes `input`, and gets every dependency through its own `.requires`, resolved from the `provide` of each module it runs in merged with the runtime's: a step is shared across modules, so its keys are declared, not inferred.
- **Checked twice.** A step on a request from `#module` is checked where it is written: each key it requires must be one the module's `provide` or the runtime returns, as that type, or `.guard` / `.use` is a type error naming the key (`this step requires clock, which neither the module's provide nor the runtime's gives as that type`). A module's own `.guard` / `.use` come before its `provide`, so only the start checks them: `runtime()` refuses a step requiring what the module and the runtime do not provide, naming the step, the request, the key and its type.

```ts skip-check
export const OwnsInvoiceGuard = guard<{ readonly invoiceId: string }>()
	.requires({ invoices: InvoicesGateway })
	.handle(async ({ input, context }, { invoices }) => {
		const invoice = await invoices.invoice(input.invoiceId);
		if (invoice === null || invoice.ownerId !== context.user?.id) return deny("not your invoice");
		return { invoice };
	});
```

## Policy order

```
in process: input → module steps → request steps → idempotency key (minted if PerCall and absent) → in-flight dedup → handle → output
outside:    input → the adapter's Authenticate → module steps → request steps → idempotency key → in-flight dedup (per user) → handle → output
```

- **Rate limit:** only where declared: `.use(RateLimitMiddleware({ calls, per }))` on a module or a request. There is no default, in any runtime. TODO: anonymous callers share one bucket per request.
- **In-flight dedup:** a second identical query waits for the first. It is keyed by request, input and user.
- Every refusal reaches the developer once through the host's `reportFailure` (the console by default) and the person once through the app's refusal handler ([views.md](views.md)).

## Idempotency

| Declaration                   | Meaning                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `.idempotencyKey(input => …)` | the same data is the same action: a repeat does nothing and answers the first answer |
| `.idempotencyKey(PerCall)`    | each call is new; the key travels with the call                                      |
| `.idempotencyKey(Repeatable)` | repeats are wanted (a toggle, a "+1" counter)                                        |

- **Done keys are scoped per user:** `${request}:${user.id ?? "anonymous"}:${key}`. A second call with a key still running waits for the first.
- **An anonymous outside caller's key made from the input is never replayed**: two strangers sending the same data through an adapter would get each other's answer. A `PerCall` key still is.
- **`PerCall` keys:** the mediator mints one for an in-process call sent with none (a view, a handler's or subscriber's send); `useCommand` keeps one per call so only a retry reuses it. An outside call brings its own: a `PerCall` call through an adapter with no key is refused (`missing-key`), and so are the sends its handler makes with none.
- The handler receives `idempotencyKey` and hands it on to a provider that supports one (Stripe).
- `MemoryDoneKeys` keeps the last 1000 and evicts only settled answers. TODO: a durable store for a server with more than one process.
- Uniqueness across users is not a key's job: it is a database constraint (see Data).

## `ran`

Every answer is `{ ok: true, output }` or `{ ok: false, code, reason, ran }`.

- A command whose handler throws answers `ran: true`: the write may have happened, so it is never retried and its done key stays.
- A handler that refuses **before** writing calls `refuse(reason)`; the answer is `{ ok: false, code: "refused", ran: false }` and the done key is released.

## Starting: `runtime()` and adapters

A runtime is shaped like a module: `.modules(...)` run in it, `.imports(...)` are reached through a transport. It assembles the running modules (routes, mediator, cache, event sources); exposing them to outside callers is an adapter's job, never the runtime's.

```ts skip-check
const layoutApp = runtime()
	.modules(LayoutModule)
	.imports(BillingModule({ over: orpcTransport(env.API_URL) }))
	.start({ platform: "tauri", scope: { workspaceId } });

const api = runtime().modules(BillingModule, UsersModule).start({ platform: "server", env: process.env });
const http = dataFrameworkMiddleware(api, { authenticate });
```

| Adapter                                                         | Exposes the runtime to                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `<RuntimeProvider runtime={…}>`                                 | views in the same process (`useQuery`, `useCommand`); no guard, no user           |
| `dataFrameworkMiddleware(runtime, { authenticate? })`           | HTTP: a Hono app answering `/rpc/*` and the changes stream at `/rpc-changes`      |
| `servePort(runtime, port, { authenticate?, headers? })`         | a page over a `MessagePort` ([The frame transport](#the-frame-transport))         |
| `local.serve(runtime, { authenticate? })` on `localTransport()` | other runtimes of the same process, importing over that transport                 |
| `runtime.expose({ adapter, authenticate? })`                    | an adapter a host writes itself (the core's IPC): `{ answer, changes, requests }` |

- `.modules(...)` take the runnable module from `<package>/module`, any placement. `start({ platform: "server" })` refuses a `Device` module; any other platform runs all three.
- `.imports(...)` take `Server` and `Anywhere` modules, by the descriptor in their `"."` entry, called with a transport: `BillingModule({ over: transport })`. Only those two are callable (a `Device` module is a type error, and refused where it is called). No server code reaches the bundle.
- **A transport is a port.** `RemoteTransport` (`transport.ts`) carries a call there and its answer back (`call`), and the changes the server reports that this client did not cause (`changes`). The framework ships `orpcTransport(url, { fetch?, headers? })` (HTTP; changes over the SSE stream at `/rpc-changes`) and `localTransport()` (same process). An app writes its own for anything else (the studio's IPC to its core window), with no change to the framework.
- **A call carries its caller's headers.** `ServedCall.headers` and `RemoteCall.headers` reach the adapter's `Authenticate`; `orpcTransport` sends them as HTTP headers, `localTransport` and the studio's IPC pass them on. A relay stamps them; the caller never writes its own.
- **`Authenticate` belongs to the adapter**, one per adapter, since only an outside caller has headers to read. An in-process call (a view, a handler's or subscriber's send) carries no user.
- **Several adapters, one runtime.** The same started runtime is served over HTTP, a port and a local transport at once; each adapter's call returns its own stop. Changes a call causes, inside or outside, reach every adapter's hearers and the runtime's own cache.
- Every module's `.imports` must be met by the runtime's `.modules` or `.imports`; start refuses naming the missing module.
- `.provide((facts) => …)` is the runtime's own provide ([Runtime provides](#runtime-provides)).
- `.start({ platform?, scope?, env?, host? })` answers the `Runtime`: `send`, `routes`, `watches`, `queryClient`, `expose`, `stop`. The host gives `doneKeys` and `reportFailure`.
- **One runtime per set of modules.** Views and adapters share it: `apps/studio/src/tabs/layout-app.ts` starts the layout once, and `RuntimeProvider` and every adapter over it use that one (`layoutApp.send`, `layoutApp.routes`).
- **An adapter answers only `.public()` requests**: an unmarked one answers `not-found`, a `.callableBy()` one `forbidden`, while an in-process `send` from another module reaches both.
- `runtime()` refuses at start, naming the request: two handlers for one request, a missing or wrong provided value, a step requiring what neither the module nor the runtime provides, a module key the runtime provides too, a declared send nothing can answer.
- **An adapter refuses to mount**, naming each request: a public request no guard covers (`PublicGuard` when anyone may call it), and, when the adapter has no `Authenticate`, a guard that needs a user. A runtime nobody exposes needs neither.
- The wire is oRPC, and only `@widgetarium/data-framework` knows it (`wire.ts`, `wire-client.ts`, `server/`). `apps/server` serves it ([hosts.md](hosts.md#deploy)).

## Runtime provides

A runtime has its own `.provide((facts) => …)`: what every module of that runtime receives, merged into each handler's, subscriber's and step's context beside the module's own `provide`. Prior art: NestJS global modules, Angular's root injector.

```ts skip-check
const api = runtime()
	.modules(BillingModule)
	.provide(({ env }) => ({ rateLimits: new RedisRateLimits(env.REDIS_URL) }))
	.start({ platform: "server", env: process.env });
```

- **Typed by `RuntimeProvides`**, an interface exported from `@widgetarium/data-framework`: `{ readonly rateLimits: RateLimits }`. `.provide` returns all of it, and every handler of a `#module` request reads it from its context.
- **An app adds keys by declaration merging**, and then passes them in its runtime's `.provide`:

```ts skip-check
declare module "@widgetarium/data-framework" {
	interface RuntimeProvides {
		readonly clock: Clock;
	}
}

runtime()
	.modules(TasksModule)
	.provide(() => ({ rateLimits: new MemoryRateLimits(), clock: new SystemClock() }))
	.start({ platform, scope });
```

- **No `.provide` means the default** `{ rateLimits: new MemoryRateLimits() }`. TODO: an app that adds keys and skips `.provide` passes the type check and lacks them at run time.
- **One owner per key.** A module whose `provide` returns a key the runtime provides is refused at start, naming the module, the key and the runtime (`module "greedy" provides rateLimits, which runtime().provide() already gives every module: rename one`). The reserved context names stay refused.
- `facts` are `{ platform, scope, env }`; `platform` and `scope` are `null` when `start` was told neither.

## The frame transport

A page in another window or a sandboxed iframe reaches modules over a `MessagePort`, the same requests and nothing else (`message-port-transport.ts`).

| Side             | Call                                                  | Does                                                                                                   |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| the page         | `portFromParent()`                                    | posts `PORT_WANTED` to the window above and takes the port it hands down; refuses after 10 s           |
| the page         | `messagePortTransport(port)`                          | a `RemoteTransport`: `call` posts `{ id, name, input, idempotencyKey }`, `changes` hears invalidations |
| the window above | `handPort(frame, port)`                               | posts the other end of a fresh `MessageChannel` into that frame only                                   |
| the window above | `servePort(runtime, port, { authenticate, headers })` | an adapter: answers each call through that runtime, stamped with `headers`; returns its stop           |
| the window above | `relayPort(answering, port, { headers })`             | the same over any `Answering` (`{ answer, changes }`), such as the shell's frame relay                 |

```ts skip-check
const files = runtime()
	.imports(FileSystemModule({ over: messagePortTransport(portFromParent()) }))
	.start();
await files.send(WriteFileCommand, { path: "tasks.json", content });
```

The port carries calls, answers and `{ invalidated }`, never a message of its own: a new kind of thing an app wants is a request of a module. Sumi's shell serves frames through a relay (`apps/studio/src/features/app-frame`): `servePortHandovers` answers only a handover wanted by that frame, stamps `x-sumi-app: <the app the shell opened there>`, and `relayPort(createFrameRelay(routes), port, …)` passes each call to the transport of the route whose module holds it (the core, or a runtime inside the studio window), refusing any other name; routes are built per frame mount ([apps.md](apps.md#the-contract)). In the core `AppCallerAuthenticate` turns the header into `user`.

## Cache and re-read

TanStack Query is the cache under the hooks; a component never touches it. A local query gets no retry and no re-read on focus; a remote one retries an unreachable server and re-reads on focus. After a successful command, exactly what it invalidated is read again ([Re-reading](#re-reading-invalidate)); a re-read keeps the previous data on screen and every unchanged part by identity. Data changing outside any command (a file edited on disk, another window) re-reads through an event from that source and a subscriber that invalidates.

## Data

**planned.** Tables are Drizzle code in `shared/schema/`; the zod shapes requests use are derived from them. Migrations are generated, never written by hand.

- **Uniqueness is an explicit choice:** `unique: [["userId", "plan"]]` or `unique: "none"`.
- **Two people editing one row:** a `version` column; an update matches `WHERE id = ? AND version = ?`, and zero rows answer "conflict".
- **A done key on a server is an atomic unique insert first**; read-then-write is forbidden.

## Background work and webhooks

**planned.** Scheduled and long-running jobs are handlers declared in a module, with idempotency on every job. A webhook lands on a server route, is verified, **stored raw first**, answered `2xx`, then applied by a command keyed by the provider's event id; a periodic job compares our rows with the provider and repairs drift.
