# Code style

How code is written inside the architecture. The rules hold in any project built on it, not only in this repository.

## Names

**A name ends with its kind**, and every declared building block is PascalCase, so a later move to classes renames nothing. camelCase is for ordinary values and functions only.

| Thing              | Rule                                                                    | Example                                               |
| ------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| a query            | noun phrase + `Query`, no `Get`                                         | `PagesQuery`                                          |
| a command          | verb phrase + `Command`                                                 | `AddPhotosCommand`                                    |
| a handler          | its request's name + `Handler`                                          | `AddPhotosCommandHandler`, `PagesQueryHandler`        |
| a guard            | what it checks + `Guard`                                                | `AuthenticatedGuard`, `OwnsInvoiceGuard`              |
| a middleware       | what it does + `Middleware`                                             | `TimingLoggerMiddleware`                              |
| a module           | its domain + its side + `Module`                                        | `CanvasClientModule`, `BillingServerModule`           |
| a request's string | `<module>/<name without the suffix, kebab case>`                        | `canvas/add-photos`                                   |
| a gateway          | what it reaches + `Gateway`, an `abstract class` that is also its token | `abstract class DesignFilesGateway`                   |
| its implementation | `<Platform><Name>Gateway`                                               | `ObsidianDesignFilesGateway`, `WebDesignFilesGateway` |
| a file             | kebab-case; a feature holds `contract.ts` and `handlers.ts`             | `obsidian.gateway.ts`, `design-reads.ts`              |

**A module is named `<Domain><Side>Module`; a handler names its module**, so its side is visible in the handler file: `handler(ChargeCommand, BillingServerModule)`. `building-block-names` enforces every row above but the files.

## The fluent chain

The fluent chain is this project's one declaration pattern: requests, handlers, guards, middleware and modules are all declared by it, as zod schemas already are.

- **One concern per call**, read top to bottom in the order it runs.
- **Every behaviour ends in `.handle()`**: a handler, a guard, a middleware. A server handler's `.handle` exists only once a guard covers it, on its module or itself; a client handler's at once.
- **`.guard` decides who may call, `.use` wraps the call**: two verbs, never one for both.
- **Never an options object.** A declaration that takes `{ inject, run, … }` is the shape this rule replaced.

```ts skip-check
export const ChargeCommandHandler = handler(ChargeCommand, BillingServerModule)
	.guard(AuthenticatedGuard)
	.guard(OwnsInvoiceGuard)
	.use(TimingLoggerMiddleware)
	.inject({ billingDb: BillingDb })
	.handle((input, { billingDb, user, invoice, idempotencyKey }) =>
		billingDb.insertCharge(input, invoice, user.id, idempotencyKey),
	);
```

The guard checks the user, the next one finds the invoice and adds it, the middleware times the rest, `.inject` names the module's dependencies, `.handle` decides: the order on the page is the order of the call.

**An injected key is named exactly like its class, in camelCase.** Never shortened, never generic:

```ts skip-check
inject: { designFilesGateway: DesignFilesGateway, designReads: DesignReads, canvasStore: CanvasStore },
```

Not `photos`, `reads`, `store`: a second store would force renaming the first. The name of a thing is the same everywhere it appears.

## A contract and its handlers

`features/photos/contract.ts`:

```ts skip-check
export const AddPhotosCommand = command("canvas/add-photos")
	.input(z.object({ photos: z.array(z.instanceof(File)) }))
	.idempotencyKey(PerCall);
```

`features/photos/handlers.ts`:

```ts skip-check
export const AddPhotosCommandHandler = handler(AddPhotosCommand, CanvasClientModule)
	.inject({ designReads: DesignReads, designFilesGateway: DesignFilesGateway, canvasStore: CanvasStore })
	.handle(async ({ photos }, { designReads, designFilesGateway, canvasStore }) => {
		const { app } = canvasStore.now();
		await addPhotos(designFilesGateway, app, photos);
		designReads.changed(app);
	});
```

- A contract imports only zod, the engine's builder and `shared/schema`: never a guard, a handler, a store or a gateway (`contract-imports`). Guards are the handler's steps, or its module's.
- `contract.ts` and `handlers.ts` stay ≤ 400 lines each. No file of a module keeps top-level state: no `let`, no writable `Map`, `Set` or array (`module-state`); state is a store the module provides. A store is storage only: one writer, a `was → became` log, its watchers told, an early exit when nothing changed. Which page a turn clears, what is persisted and when a look fades are decisions, so they live in handlers, and persistence goes through a gateway (`RendererPreferenceGateway`, `CanvasHost.keepOpening`). A feature that outgrows that splits into two features.
- **No reach-through.** A handler calls what it injected: `designFilesGateway.writeText(…)`, never `designReads.folder.write(…)`. If it needs it, it injects it.
- A handler that refuses before writing calls `refuse(reason)` rather than throwing ([requests.md](requests.md#ran)).

## A module and what it provides

A class built in `provide` takes its dependencies as constructor arguments:

```ts skip-check
export const CanvasClientModule = clientModule("canvas").provide((parts: CanvasParts) => ({
	...parts,
	designReads: new CachedDesignReads(parts.designFolderGateway, parts.agentJobsGateway, parts.designFilesGateway),
}));
```

The host builds the parts once per mount, one factory per platform in `gateways/canvas-parts/`: `webCanvasParts(project, canvasHost)`, `obsidianCanvasParts(obsidianDesign, canvasHost)`, both from `"./gateways"`.

## A block

- Reads its own requests with `useQuery` / `useOptionalQuery` / `useCommand`; gets no handlers or data through props from a parent.
- Holds no decision about data. The query answers the shape it draws; the command decides.
- Holds no pointer, scroll or drag math: a primitive from Radix or `packages/behaviors` does it.
- ≤ 80 lines per component; a part that grows becomes its own file beside it. A hook or helper it needs is a `.ts` file in its feature's `lib/` (or `shared/lib/` when two features use it), since `ui/` holds only `.tsx`.

## A gateway

- Declared as an `abstract class` with abstract methods; that class is what `inject` names.
- Every implementation sits beside it, named for its platform (`obsidian.gateway.ts`, `web.gateway.ts`); one with private parts gets its own folder (`obsidian/obsidian.gateway.ts` and its parts).
- Only calls its system, by path; its methods return typed results and throw only refusals from its closed list.
- **One area per class, split by area, never by line count.** Method names repeating one noun (`jobs`, `onJobs`, `liveJob`, `stopJob`) mean that noun is a class of its own. Moving bodies into free-function files to shorten a class is not a split: it adds a hop and keeps every job in one place. The `cohesion-reviewer` agent checks this.

| Before: one `DesignSource` (15 members)      | After: one class per area                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `design`, `docs`, `onChanged`, `noteBoard`   | `DesignFolderGateway`                                                     |
| `jobs`, `onJobs`, `liveJob`, `stopJob`       | `AgentJobsGateway`                                                        |
| `drawing`                                    | `WidgetDrawingGateway`                                                    |
| `addPhotos`, `moveLayer`, `look`, `pickLook` | `DesignFilesGateway`: one system, the design's files, whoever writes them |
| `returnToView`                               | `CanvasHost`                                                              |

## Comments

Only `TODO:` (debt to repay) and `TRADE-OFF:` (a worse choice taken, and why), in the fewest words. A name that needs a comment is renamed.
