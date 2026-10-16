# Code style

How code is written inside the architecture. The rules hold in any project built on it, not only in this repository.

## Names

| Thing              | Rule                                             | Example                                                                 |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------------------- |
| a query            | noun phrase + `Query`, no `Get`                  | `PagesQuery`                                                            |
| a command          | verb phrase + `Command`                          | `AddPhotosCommand`                                                      |
| a handler          | the request's name + `Handler`                   | `AddPhotosCommandHandler`                                               |
| a request's string | `<module>/<name without the suffix, kebab case>` | `canvas/add-photos`                                                     |
| an adapter         | an `abstract class`, which is also its token     | `abstract class DesignSource`                                           |
| its implementation | `<Platform><Adapter>` or `<Kind><Adapter>`       | `ObsidianDesignSource`, `ProjectDesignSource`                           |
| a module           | `<domain>Module`                                 | `canvasModule`                                                          |
| a file             | kebab-case + its kind                            | `add-photos.command.ts`, `add-photos.handler.ts`, `obsidian.adapter.ts` |

**An injected field is named exactly like its class, in camelCase.** Never shortened, never generic:

```ts skip-check
private readonly designSource = this.inject(DesignSource);
private readonly designReads = this.inject(DesignReads);
private readonly canvasStore = this.inject(CanvasStore);
```

Not `source`, `reads`, `store`: a second store would force renaming the first. The name of a thing is the same everywhere it appears.

## A contract and a handler

```ts skip-check
// requests/add-photos.command.ts
export const AddPhotosCommand = command("canvas/add-photos")
	.input(z.object({ photos: z.array(z.instanceof(File)) }))
	.idempotencyKey("per-call");
```

```ts skip-check
// client/photos/add-photos.handler.ts
export class AddPhotosCommandHandler extends handlerOf(AddPhotosCommand) {
	private readonly designReads = this.inject(DesignReads);
	private readonly designSource = this.inject(DesignSource);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ photos }: InputOf<typeof AddPhotosCommand>): Promise<void> {
		const { app } = this.canvasStore.now();
		await this.designSource.addPhotos(app, photos);
		this.designReads.changed(app);
	}
}
```

- The contract holds no import of a handler, a store or an adapter: only zod, the engine's `query`/`command` and schemas.
- Injected fields first, then `handle`, then `override watch({ changed })` when the data changes outside a command, then private helpers.
- **No reach-through.** A handler calls what it injected: `this.designSource.addPhotos(…)`, never `this.designReads.source.addPhotos(…)`. If it needs it, it injects it.
- **Another request is sent, never called:** `await this.send(OtherCommand, input)`.
- `handlerOf(Request)` names the request once. A generic `Handler<Request>` would not work: a type is gone at runtime, and the engine needs the request as a value to route to the class.

## A provided value

A class built by a provider takes its dependencies as constructor arguments; the factory hands them over:

```ts skip-check
provided(DesignReads, {
	obsidian: (_host, inject) => new CachedDesignReads(inject(DesignSource)),
	web: (_host, inject) => new CachedDesignReads(inject(DesignSource)),
});
```

A factory used for several platforms is one named function referenced from each entry. A factory reads only its own host: `host.project` in `web`, `host.app` in `obsidian`; there is nothing to check for null.

## A block

- Reads its own requests with `useQuery` / `useOptionalQuery` / `useCommand`; gets no handlers or data through props from a parent.
- Holds no decision about data. The query answers the shape it draws; the command decides.
- Holds no pointer, scroll or drag math: a primitive from Radix or `packages/behaviors` does it.
- ≤ 80 lines per component; a part that grows becomes its own file beside it. A hook or helper it needs is a `.ts` file in `lib/`, since `ui/` holds only `.tsx`.

## An adapter

- Declared as an `abstract class` with abstract methods; that class is what `this.inject()` and `provided()` take.
- Every implementation sits beside it, named for its platform; one with private parts gets its own folder.
- Its methods return typed results and throw only refusals from its closed list.

## Comments

Only `TODO:` (debt to repay) and `TRADE-OFF:` (a worse choice taken, and why), in the fewest words. A name that needs a comment is renamed.
