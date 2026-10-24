# Views

Views live in client packages (`packages/client/<name>`, `"level": "client"`). A page is a composition of blocks; a block is a plain React component that reads its own requests; a layout is a block that places slots and reads nothing; a package exports its root views from `shared/ui/index.ts`. A view decides nothing about data.

## Four rules

1. **A view makes no decision about data.** A query answers already shaped for what is drawn; a command receives the bare intent and decides.

   ```ts skip-check
   LayersPanelQuery → { isShown, rows: [{ id, title, depth, isPicked, isOpen }] }
   useCommand(PickLayerCommand).run({ id: row.id })
   ```

   Toggling the pick is the handler's rule, not the view's.

2. **Behavior comes from primitives.** Scroll into view, drag to reorder, collapse, focus and keyboard come from Radix or `packages/shared/behaviors`. Hand-written pointer math in a block is a lint finding (**planned**).
3. **A block owns its data; a layout passes none.** A layout only says where blocks stand. Swapping a block is one line.
4. **Not all state is data.** State that must survive a restart, or that another part of the screen reads (a sidebar shown, pane shares, the chosen chat), is data: a query and a command of a data module. State of one block for a moment (hover, an animation frame, the pointer during a drag, scroll) stays in the view. A drag lives in the view while it moves and becomes a command when it is released.

## Reaching the data

The app starts the modules and gives the views their app:

```tsx skip-check
const layoutApp = startLayoutApp({ platform, workspaceId });

<AppProvider app={layoutApp}>
	<StudioFrame />
</AppProvider>;
```

A block imports requests from the data module's `"."` and reads them through the hooks; it never imports `"./module"`, a handler or a gateway. An adapter outside React that needs the same data uses the same started app (`layoutApp.send`, `layoutApp.routes`), never a second one.

## Reading and writing

```tsx skip-check
export function TaskList() {
	const tasks = useQuery(TasksQuery, { status: "open" });
	const stats = useOptionalQuery(TaskStatsQuery, {});
	const complete = useCommand(CompleteTaskCommand);
	if (tasks.data.items.length === 0) return <EmptyTasks />;
	return tasks.data.items.map((task) => {
		const done = complete.with({ id: task.id });
		return <TaskRow key={task.id} task={task} isBusy={done.isRunning} onDone={() => done.run()} />;
	});
}
```

|               | `useQuery`                                        | `useOptionalQuery`                                     |
| ------------- | ------------------------------------------------- | ------------------------------------------------------ |
| While loading | the block waits; the slot around it shows loading | the block draws at once; `isLoading`                   |
| On error      | goes to the slot's error                          | stays in `failure`, is logged; the block keeps working |
| `data`        | the output schema's type                          | the output schema's type or `null` while not read      |

The second argument is always the request's input. Choose by one question: can the block draw anything meaningful without this data? No → `useQuery`.

A command handle has `run(input)`, `isRunning`, `refusal`, `can`, `cannotBecause`, and `with(input)` bound to one input. `can` / `cannotBecause` say only whether the request can be routed; they never evaluate guards. Every refusal goes to the app's one refusal handler (`OnRefused`, `toastRefusal` by default); a block shows `refusal` inline only where it fits.

## Layouts and slots

A layout is built from `<Slot>`, and a slot is a boundary: Suspense for a block's required data and an error boundary for its failures. Both have defaults from the kit; a block that needs its own passes them: `<Slot loading={<TasksSkeleton />} error={(refusal) => <TasksFailed reason={refusal} />}>`. Inside a block, `<Section>` is the same boundary around one part. `useQuery` suspends only on its first read of an input.

**Empty is a design decision, not a rule.** The design canvas draws every block with empty answers (a fake mediator answers the requests), so a person sees the empty look and decides.

## View-only state shared between blocks

When two mounted blocks share something that is not data (a DOM node a header portals into, the look a mounted plate paints), it is a small object in the client package's `lib/`, provided through React context and read with `useSyncExternalStore`: `PlateHeaderStore` in `client/shell`. It holds nothing that must survive a restart and no rule about data.

## Size

A file ≤ 200 lines, a component ≤ 80. A block that grows splits into parts beside it in its folder, each still reading its own requests where it needs data.
