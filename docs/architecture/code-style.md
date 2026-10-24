# Code style

How code is written inside the architecture. The rules hold in any project built on it, not only in this repository.

## Names

**A name ends with its kind**, and every declared building block is PascalCase, so a later move to classes renames nothing. camelCase is for ordinary values and functions only.

| Thing              | Rule                                                                     | Example                                                         |
| ------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| a query            | noun phrase + `Query`, no `Get`                                          | `FrameSidesQuery`                                               |
| a command          | verb phrase + `Command`                                                  | `ToggleFrameSideCommand`                                        |
| a request's string | the constant without its suffix, kebab case; the module adds `<module>/` | `"toggle-frame-side"` → `layout/toggle-frame-side`              |
| a module           | its area + `Module`                                                      | `LayoutModule`                                                  |
| a guard            | what it checks + `Guard`                                                 | `AuthenticatedGuard`, `OwnsInvoiceGuard`                        |
| a middleware       | what it does + `Middleware`                                              | `TimingLoggerMiddleware`                                        |
| a gateway          | its data + `Gateway`, an `abstract class` that is also its token         | `FrameSidesGateway`, `PaneTreeGateway`                          |
| its implementation | `<Storage><Name>Gateway`: what it stores in                              | `TauriFrameSidesGateway`, `FlagMemoryFrameSidesGateway`         |
| a gateway method   | the data it reads or writes, never a generic verb                        | `sides()`, `saveSides(sides, reason)`, `sidesChanged(listener)` |
| a storage shape    | `Kept<Name>Schema`, beside its gateway                                   | `KeptPaneTreeSchema`                                            |
| a file             | kebab-case                                                               | `requests.ts`, `tauri.gateway.ts`, `side-looks.ts`              |

`building-block-names` enforces the PascalCase and suffix rows; `feature-layout` the request string.

## The fluent chain

The fluent chain is this project's one declaration pattern: requests, modules, guards and middleware are all declared by it, as zod schemas already are.

- **One concern per call**, read top to bottom in the order it runs.
- **Every behaviour ends in `.handle()`**: a request, a guard, a middleware.
- **`.guard` decides who may call, `.use` wraps the call**: two verbs, never one for both.
- **Never an options object.** A declaration that takes `{ inject, run, … }` is the shape this rule replaced.

```ts skip-check
export const PayInvoiceCommand = command("pay-invoice")
	.input(PayInvoiceInputSchema)
	.idempotencyKey((input) => input.invoiceId)
	.guard(AuthenticatedGuard)
	.guard(OwnsInvoiceGuard)
	.use(TimingLoggerMiddleware)
	.inject({ invoices: InvoicesGateway })
	.handle((input, { invoices, invoice, user, idempotencyKey }) => {
		const refusal = refusePayment(invoice);

		if (refusal !== null) {
			return refuse(refusal);
		}

		return invoices.savePayment(paymentOf(invoice, user.id, idempotencyKey));
	});
```

## Injected keys

**An injected key is the data's name: the class name without `Gateway`, in camelCase.** `frameSides: FrameSidesGateway`, `paneTree: PaneTreeGateway`, `invoices: InvoicesGateway`. Never shortened further, never generic (`store`, `data`, `gw`). The name of a thing is the same everywhere it appears: the key in `.inject`, the field in `provide`, the parameter in `.handle`.

## A request

- `requests.ts` imports only `@widgetarium/core/requests`, `zod`, its own `shared/schema`, its gateways, its feature's `lib/`, `shared/lib/` and other modules' `"."` entries.
- Its schemas live in `shared/schema/`, never beside the request: the generator refuses one declared there.
- **No reach-through.** A handler calls what it injected: `frameSides.saveSides(…)`, never `layout.frameSides.saveSides(…)`. If it needs it, it injects it.
- A handler that refuses before writing calls `refuse(reason)` rather than throwing.
- `requests.ts` stays ≤ 400 lines. A feature that outgrows it splits into two features.
- No file of a data module keeps top-level state: no `let`, no writable `Map`, `Set` or array (`module-state`). State lives behind a gateway.

## Logging

A command that changes state logs the transition, never the event: `was → now` and why.

```ts skip-check
const reason = `frame side ${side} ${was} → ${next} (toggle)`;
frameSides.saveSides(next, reason);
console.info(`[widgetarium] ${reason}`);
```

- The same `reason` string goes to the gateway (the storage may keep it) and to the log.
- Every early exit logs why: `frame side left peek skipped: docked`.
- A refusal carries its reason in `refuse(…)`; the app reports it once to the developer and once to the person.
- The prefix is `[widgetarium]`. TODO: a project logger in place of `console`.

## A module and what it provides

```ts skip-check
const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => LayoutParts>> = {
	browser: ({ scope }) => webLayoutParts(scope.workspaceId),
	tauri: ({ scope }) => tauriLayoutParts(scope.workspaceId),
	server: () => serverLayoutParts(),
};

export function layoutPartsOn(facts: ModuleFacts): LayoutParts {
	return PARTS_ON[facts.platform](facts);
}
```

- One picker per module in `gateways/<module>-parts/`: a record keyed by `Platform`, so a new platform is a type error until every module answers it.
- A class built there takes its dependencies as constructor arguments.
- `module.ts` holds only `module(...)…provide((facts) => ({ ...layoutPartsOn(facts) }))`.

## A block

- Reads its own requests with `useQuery` / `useOptionalQuery` / `useCommand`; gets no handlers or data through props from a parent.
- Holds no decision about data. The query answers the shape it draws; the command decides.
- Holds no pointer, scroll or drag math: a primitive from Radix or `packages/shared/behaviors` does it.
- ≤ 80 lines per component; a part that grows becomes its own file beside it. A hook or helper it needs is a `.ts` file in its feature's `lib/` (or `shared/lib/` when two features use it), since `ui/` holds only `.tsx`.

## A gateway

- Declared as an `abstract class` with abstract methods; that class is what `.inject` names.
- Every implementation sits beside it, named for its storage (`tauri.gateway.ts`, `px-memory.gateway.ts`); one with private parts gets its own folder.
- Stores and hands back, nothing else ([layers.md](layers.md)): it may map, serialize, check a stored shape and translate a storage error; it never decides, never calls another gateway.
- **One area per class, split by area, never by line count.** Method names repeating one noun (`jobs`, `onJobs`, `liveJob`, `stopJob`) mean that noun is a class of its own. Moving bodies into free-function files to shorten a class is not a split. The `cohesion-reviewer` agent checks this.

## Comments

Only `TODO:` (debt to repay) and `TRADE-OFF:` (a worse choice taken, and why), in the fewest words. A name that needs a comment is renamed.
