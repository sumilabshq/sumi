# Where a file goes

A file's place is decided by **what it is**, never by how many places use it. Nothing moves when a second user appears, so no one has to guess.

## Inside a domain

```
packages/<domain>/
  index.ts                       public API: re-exports only
  package.json                   name, level, the domains it uses
  schemas/
    <record>.schema.ts
  logic/
    <record>/
      <name>.query.ts
      <name>.command.ts
      <name>.service.ts
  ui/                            everything drawn: components with props only, no data
    <view>/
      <view>.tsx
      hooks/                     state of the view only
      lib/                       pure view math (hit testing, geometry)
  widgets/
    <widget>.widget.ts           the link from one view to data: ports, states, the view it renders
```

- `index.ts` holds re-exports and nothing else.
- A file in `logic/<record>/` without a handler suffix is a plain helper private to that folder: a rule about the record that several handlers share.
- A rule about records is never in `ui/`; it is logic.
- A part with no domain goes to the kit.

## Widget and view

A **view** is what the person sees: a plain React component in `ui/`, TSX + Tailwind, props only. It reads and writes nothing; it can be drawn anywhere with plain values.

A **widget** is the layer between a view and data. It draws nothing itself:

```ts skip-check
export const layersPanelInject = inject({
	layersQuery: IQuery.input(PageInputSchema).output(PageOf(LayerSchema)),
	pickLayerCommand: ICommand.input(LayerPickSchema),
});

export const LayersPanel = widget()
	.inject(layersPanelInject)
	.states({ empty: { layersQuery: [] } })
	.render(LayersPanelView);
```

```tsx skip-check
import type { layersPanelInject } from "../../widgets/layers-panel.widget.js";

export function LayersPanelView({ layersQuery, pickLayerCommand }: InjectProps<typeof layersPanelInject>) {
	return layersQuery.data.items.map((layer) => {
		const pick = pickLayerCommand.with({ id: layer.id });
		return (
			<button key={layer.id} disabled={!pick.can || pick.isRunning} onClick={() => pick.run()}>
				{layer.name}
			</button>
		);
	});
}
```

- The inject is declared once, as a constant in the widget file. The view takes its props type from it with `InjectProps<typeof …>`, so changing the inject changes the view's types. A view never writes its props type by hand.
- `.render()` refuses a view whose props are not exactly `InjectProps` of the widget's inject.
- The view's import of the widget is `import type`: erased at build, so there is no cycle. `InjectProps<typeof LayersPanel>` would be one (the widget's type depends on the view), which is why the inject is its own constant.
- **A widget answers one question.** A widget has more props than a component, because every read and write comes from outside: that is expected. More than 12 entries in an inject usually means it draws several things: split it into small widgets and compose them in a layout widget with positions (`header`, `start`, `end`, `bottom`), placed by the app. Never add a query that bundles data only to cut the number of props.
- Props, never context: a view moved elsewhere fails to type-check when its data is missing, instead of silently reading `undefined`.

### Handles

An inject key names its kind: an `IQuery` key ends in `Query`, an `ICommand` key in `Command` (the types refuse any other name). The view gets a **handle** for each, created by the widget layer per mounted widget — the handler itself holds no state.

| Handle                | Has                                                                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `…Query`              | `data` (never missing: the layer waits for the first read), `isLoading` (a re-read), `failure`, `ask(input)`; over a page also `more()`, `hasMore`, `total` |
| `…Command`            | `run(input)`, `isRunning`, `refusal` (the last reason or `null`), `can`, `cannotBecause`                                                                    |
| `command.with(input)` | the same command handle bound to one input: `run()`, and `isRunning`, `refusal`, `can` of that input only                                                   |
| a slot                | the drawn children                                                                                                                                          |

- **One rule for a list:** an action on one item is `command.with(input)`; an action on everything is `command`. Never a hook per row, never a second way.
- Every refusal goes to the app's one refusal handler (a toast by default) and to the log; a view shows `refusal` inline only where an inline message fits.
- Outside widgets, plain React calls `useQuery(query)` / `useCommand(command)` and gets the same handles. A view inside a widget calls neither.
- Loading and failure are drawn by the widget layer (`.pending()`, `.failed()`, engine defaults otherwise), and a view that throws is caught there, so a view never draws a missing value and never takes its neighbours down.
- A widget declares no metadata and no layout. Labels, sizes and catalogue cards are not part of it.
- **When to write a widget:** you always write a view. You write a widget when that view must stand on a board and get its data from the app.

## The table

| The file is…                                                                           | It goes to                                                  |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| the shape of a record                                                                  | `packages/<domain>/schemas/<record>.schema.ts`              |
| something drawn for a domain                                                           | `packages/<domain>/ui/<view>/` + `widgets/<name>.widget.ts` |
| something drawn whose schema names no record                                           | a common widget package (`registry/`)                       |
| a read for a widget                                                                    | `packages/<domain>/logic/<record>/<name>.query.ts`          |
| a write                                                                                | `packages/<domain>/logic/<record>/<name>.command.ts`        |
| work that runs alone (cursor tracking, sync, a timer)                                  | `packages/<domain>/logic/<record>/<name>.service.ts`        |
| reading or writing an outside system (vault, Supabase, SQL, an existing backend's API) | a common package, `sources/<system>/`                       |
| a pure helper (format a date, clamp a number)                                          | a common package, `lib/`                                    |
| a drawn part with no domain (resize handle, spinner)                                   | the kit                                                     |
| a route, a page and its wiring (TSX)                                                   | `apps/<product>/`                                           |
| how to render, store, or reach the network on one platform                             | `hosts/<runtime>/`                                          |

`<record>` is the kind of record (`tasks`), `<name>` is the file (`create-task`). Example: `packages/planning/logic/tasks/create-task.command.ts`.

## Questions an agent asks, answered

**Another domain needs this query.** It stays where it is and is exported from the domain's `index.ts`. The other domain declares the dependency and imports it.

**Two apps need the same widget.** It is in a domain already; both apps import it from the domain's `index.ts`.

**Does this go to common?** Only if it names no record of any domain. Common cannot import a domain, so a file that needs a domain schema does not compile there.

**Is there already a query for this?** Open `packages/<domain>/logic/<record>/`. Every query of a record is in that one folder.

**A person already has a backend.** Its HTTP API is a data source in common (`sources/<their-api>/`); queries and commands call it. Nothing else changes: the backend is an outside system like the vault.

**A hook in a widget?** Yes, in `hooks/`, for state of the view only: hover, open, a drag in progress. A hook never reads or writes data; that is a query or a command reached through a port.

**A widget that draws tasks as a kanban and as a table?** Two widgets, `task-kanban` and `task-table`, given the same query by the app.

## File names

| Suffix        | Kind                                                             |
| ------------- | ---------------------------------------------------------------- |
| `.schema.ts`  | zod schema; the value is named `*Schema`, its type has no suffix |
| `.query.ts`   | one `*Query` class                                               |
| `.command.ts` | one `*Command` class                                             |
| `.service.ts` | one `*Service` class                                             |
| `.tsx`        | a widget or a drawn part, TSX + Tailwind                         |

Files are kebab-case; exports are named. Whether a handler runs only on a server is written in its code, not in its file name ([handlers.md](handlers.md#server-handlers)).
