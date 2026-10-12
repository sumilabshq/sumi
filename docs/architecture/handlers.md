# Handlers

"Handler" is the shared word for the three kinds of logic class. A widget declares ports; a handler answers one. Logic exists only in handlers.

| Kind    | Is                                                          | Called by                                                         |
| ------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| query   | reads; answers a value or a page of rows                    | a widget, or other logic directly                                 |
| command | writes; answers `{ ok, output }` or `{ ok: false, reason }` | a widget, or other logic directly                                 |
| service | runs on its own: starts with the app, stops with it         | nothing; it writes through commands or keeps a value queries read |

A handler is an ordinary class. What it needs comes through its constructor; nothing registers it, names it or describes it:

```ts skip-check
class PagesQuery extends IQuery.output(CanvasPagesSchema) {
	constructor(private readonly source: DesignSource, private readonly state: CanvasState) { super(); }
	async query() { ... }
}

class SelectCommand extends ICommand.input(SelectAskSchema) {
	constructor(private readonly state: CanvasState) { super(); }
	async run(input) { ... }
}
```

A list is always a page: `PageInputSchema` in, `PageOf(Row)` out.

## The app composes everything

The app is the composition root: a React component that creates the handlers with `new`, hands them their dependencies, and passes them to widgets as props.

```tsx skip-check
export function CanvasPage({ source }: { source: DesignSource }) {
	const state = useMemo(() => createCanvasState(), []);
	const pages = useMemo(() => new PagesQuery(source, state), [source, state]);
	const select = useMemo(() => new SelectCommand(state), [state]);
	return (
		<CanvasField pages={pages} select={select}>
			<LayersPanel layers={new LayersQuery(source)} pick={select} />
		</CanvasField>
	);
}
```

- A widget prop takes a query or command instance, or a plain value; the widget layer turns it into what the view receives ([placement.md](placement.md#widget-and-view)).
- A plain function is wrapped once per function, so its reads stay cached while the function is the same. An inline arrow is a new function every render: it reads again each time. Create it once (`useMemo`, `useCallback`, or a handler class).
- Every query and command a widget injects is a required prop: a forgotten handler does not compile. A command given nothing answers `{ ok: false, reason: "<name> is not given" }`.
- A command's refusal goes to one handler the app sets once, `<OnRefused value={handler}>` from `@widgetarium/core`; with none set, the kit's toaster shows the reason. The widget layer logs every outcome; a view writes no refusal code.
- There are no packs, no handler ids, no bindings in JSON and no handler metadata (`title`, `resource`, `description`). Swapping an implementation is a code change in the app; a test passes a fake class.
- A command that writes the vault takes `consent: "ask"` in its constructor and runs only after the person's switch.

**What it gives:** the layout and the wiring are one readable file; go-to-definition opens the real handler from the page.

## How logic reaches other logic

| Needs                                                 | How                                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| a handler of the same domain                          | import it                                                                        |
| a data source (vault, Supabase, an existing backend)  | import it from common, or take it in the constructor when the host decides which |
| a handler of another domain                           | import it from that domain's `index.ts`, declared in `package.json`              |
| something the app or host chooses (storage, provider) | a constructor parameter, passed by the app                                       |

## Server handlers

**planned.** A handler that holds a secret is marked in its code:

```ts skip-check
class ChargeCardCommand extends ICommand.server().input(CardSchema).output(ReceiptSchema) {
	async run(input, { secrets }) { ... }
}
```

- `secrets` exists only in the `ctx` of a `.server()` handler.
- **Two composition roots.** The app's page (`app.tsx`) runs in the browser and composes everything that runs there. A `.server()` handler is composed only in the app's **server root** (`server.ts`), which runs on the server, reads secrets from the server's environment and creates the SQL client, the payment client and the server handlers.
- The browser root never imports a `.server()` handler, its SQL client or its secrets: it gets a stub with the same port that calls `/rpc/<name>`. The widget sees no difference.
- A client bundle that reaches a `.server()` file, or a module only a server file may import, fails the build and names the import chain; lint says the same in the editor.
- A host with no server (the Obsidian plugin) refuses a `.server()` handler at build time. A key a person types into the plugin's settings is their own key on their own machine, not a secret of the app.

## Services

**planned.** A service is a class with `start()` and `stop()`. The app creates the services it runs. A service never draws and is never called by a widget; a widget sees its work only through a query.
