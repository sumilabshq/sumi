# Code style

How code is written inside the architecture. The rules hold in any project built on it, not only in this repository.

## Names

| Thing              | Rule                                             | Example                                      |
| ------------------ | ------------------------------------------------ | -------------------------------------------- |
| a query            | noun phrase + `Query`, no `Get`                  | `PagesQuery`                                 |
| a command          | verb phrase + `Command`                          | `AddPhotosCommand`                           |
| a handler          | the request's name + `Handler`                   | `AddPhotosCommandHandler`                    |
| a request's string | `<module>/<name without the suffix, kebab case>` | `canvas/add-photos`                          |
| a dependency       | an `abstract class`, which is also its token     | `abstract class DesignSource`                |
| its implementation | `<Provider><Dependency>`                         | `ObsidianDesignSource`                       |
| a module           | `<domain>Module`                                 | `canvasModule`                               |
| env                | `<part>Env`                                      | `stripeEnv`                                  |
| a file             | kebab-case, named after what it holds            | `add-photos.ts`, `design-source-obsidian.ts` |

**An injected field is named exactly like its class, in camelCase.** Never shortened, never generic:

```ts skip-check
private readonly designSource = inject(DesignSource);
private readonly designReads = inject(DesignReads);
private readonly canvasStore = inject(CanvasStore);
```

Not `source`, `reads`, `store`: a second store would force renaming the first, and `store` beside `source` reads as the same word. The name of a thing is the same everywhere it appears.

## A handler

```ts skip-check
export const AddPhotosCommand = command("canvas/add-photos").input(PhotosSchema).idempotencyKey("per-call");

export class AddPhotosCommandHandler extends handlerOf(AddPhotosCommand) {
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ photos }: InputOf<typeof AddPhotosCommand>): Promise<void> {
		const { app } = this.canvasStore.now();
		await this.designSource.addPhotos(app, photos);
	}
}
```

- One request and its handler per file; the request first, the handler under it.
- Injected fields first, then `handle`, then private helpers.
- **No reach-through.** A handler calls what it injected: `this.designSource.addPhotos(…)`, never `this.designReads.source.addPhotos(…)`. If it needs it, it injects it.
- `handlerOf(Request)` names the request once. A generic `Handler<Request>` would not work: a type is gone at runtime, and the engine needs the request as a value to route to the class.
- Early returns over nesting; no variable that only renames another.

## A block

- Reads its own requests with `useQuery` / `useOptionalQuery` / `useCommand`; gets no handlers or data through props from a parent.
- Holds no decision about data: no `a === b ? null : a` on request data, no lookups across answers. The query answers the shape it draws; the command decides.
- Holds no pointer, scroll or drag math: a primitive from Radix or `packages/behaviors` does it.
- ≤ 80 lines per component; a part that grows becomes its own file beside it.

## A dependency

- Declared as an `abstract class` with abstract methods; that class is what `inject()` and `provided()` take.
- Every implementation sits beside it, named `<Provider><Dependency>`.
- Its methods return typed results and throw only refusals from its closed list.

## Comments

Only `TODO:` (debt to repay) and `TRADE-OFF:` (a worse choice taken, and why), in the fewest words. A name that needs a comment is renamed.
