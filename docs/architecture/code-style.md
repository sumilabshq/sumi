# Code style

How code is written inside the architecture. The rules hold in any project built on it, not only in this repository.

## Names

| Thing              | Rule                                                             | Example                                    |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------ |
| a query            | noun phrase + `Query`, no `Get`                                  | `PagesQuery`                               |
| a command          | verb phrase + `Command`                                          | `AddPhotosCommand`                         |
| a handler          | the request without its suffix, camelCase + `Handler`            | `addPhotosHandler`                         |
| a request's string | `<module>/<name without the suffix, kebab case>`                 | `canvas/add-photos`                        |
| an adapter         | an `abstract class`, which is also its token                     | `abstract class DesignPhotos`              |
| its implementation | `<Kind><Adapter>`                                                | `VaultDesignPhotos`, `ProjectDesignPhotos` |
| a module           | `<domain>Module`                                                 | `canvasModule`                             |
| a guard            | `guard({ inject, check })`, named after what it checks + `Guard` | `AuthenticatedGuard`, `OwnsInvoiceGuard`   |
| a file             | kebab-case; a feature holds `contract.ts` and `handlers.ts`      | `vault.adapter.ts`, `design-reads.ts`      |

**An injected key is named exactly like its class, in camelCase.** Never shortened, never generic:

```ts skip-check
inject: { designPhotos: DesignPhotos, designReads: DesignReads, canvasStore: CanvasStore },
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
export const addPhotosHandler = handler(AddPhotosCommand, {
	inject: { designReads: DesignReads, designPhotos: DesignPhotos, canvasStore: CanvasStore },
	run: async ({ photos }, { designReads, designPhotos, canvasStore }) => {
		const { app } = canvasStore.now();
		await designPhotos.add(app, photos);
		designReads.changed(app);
	},
});
```

- A contract imports only zod, the engine's builder, guards and schemas: never a handler, a store or an adapter. A client module's contract has no guard; a server module's has at least one.
- `contract.ts` and `handlers.ts` stay ≤ 400 lines each, with no top-level `let`. A feature that outgrows that splits into two features.
- **No reach-through.** A handler calls what it injected: `designPhotos.add(…)`, never `designReads.folder.add(…)`. If it needs it, it injects it.
- A handler that refuses before writing calls `refuse(reason)` rather than throwing ([requests.md](requests.md#ran)).

## A module and what it provides

A class built in `provide` takes its dependencies as constructor arguments:

```ts skip-check
provide: (parts: CanvasParts) => ({
	...parts,
	designReads: new CachedDesignReads(parts.designFolder, parts.designJobs, parts.appLook),
}),
```

The host builds the parts once per mount, one function per host: `projectCanvasParts(project, canvasHost)` in `module.ts`, `vaultCanvasParts(vaultDesign, canvasHost)` in `vault.ts`.

## A block

- Reads its own requests with `useQuery` / `useOptionalQuery` / `useCommand`; gets no handlers or data through props from a parent.
- Holds no decision about data. The query answers the shape it draws; the command decides.
- Holds no pointer, scroll or drag math: a primitive from Radix or `packages/behaviors` does it.
- ≤ 80 lines per component; a part that grows becomes its own file beside it. A hook or helper it needs is a `.ts` file in `lib/`, since `ui/` holds only `.tsx`.

## An adapter

- Declared as an `abstract class` with abstract methods; that class is what `inject` names.
- Every implementation sits beside it, named for its host (`vault.adapter.ts`, `project.adapter.ts`); one with private parts gets its own folder (`vault/vault.adapter.ts` and its parts).
- Only calls its system, by path; its methods return typed results and throw only refusals from its closed list.

## Comments

Only `TODO:` (debt to repay) and `TRADE-OFF:` (a worse choice taken, and why), in the fewest words. A name that needs a comment is renamed.
