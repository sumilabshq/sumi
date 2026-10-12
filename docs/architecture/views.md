# Views

A page is a composition of blocks. A block is a plain React component that reads its own requests. A view decides nothing about data.

## Four rules

1. **A view makes no decision about data.** A query answers already shaped for what is drawn; a command receives the bare intent and decides.

   ```ts skip-check
   GetLayersPanel → { isShown, rows: [{ id, title, depth, isPicked, isOpen }] }
   pickLayer.run({ id: row.id })   // toggling the pick is the handler's rule, not the view's
   ```

2. **Behavior comes from primitives.** Scroll into view, drag to reorder, collapse, focus and keyboard come from Radix or `packages/behaviors` (headless, tested). Hand-written pointer math in a block is a lint finding.
3. **A block owns its data; a layout passes none.** A layout only says where blocks stand. Swapping a block is one line.
4. **State lives where it is needed.** Only this block, only for a moment (hover, an open popover) → the primitive's own state. Another block needs it, or it survives navigation → a query and a command over a client store.

## Reading and writing

```tsx skip-check
export function TaskList() {
	const tasks = useQuery(GetTasks, { status: "open" });
	const stats = useOptionalQuery(GetTaskStats, {});
	const complete = useCommand(CompleteTask);
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

A command handle has `run(input)`, `isRunning`, `refusal`, `can`, `cannotBecause`, and `with(input)` bound to one input. Every refusal goes to the app's one refusal handler (a toast by default); a block shows `refusal` inline only where it fits. A second run of an input still running is refused to the caller.

## Layouts and slots

```tsx skip-check
export function CanvasPage() {
	return (
		<CanvasLayout header={<PageTabs />} start={<LayersPanel />} end={<LookPanel />}>
			<CanvasField />
		</CanvasLayout>
	);
}
```

A layout is built from `<Slot>`, and a slot is a boundary: Suspense for a block's required data and an error boundary for its failures. Both have defaults from the kit; a block that needs its own passes them: `<Slot loading={<TasksSkeleton />} error={(refusal) => <TasksFailed reason={refusal} />}>`. Inside a block, `<Section>` is the same boundary around one part, so a failing column does not break the block. A block that reads no required data needs nothing.

**Empty is a design decision, not a rule.** Drawing nothing for zero items is often right. The design canvas draws every block with empty answers (a fake mediator answers the requests), so a person sees the empty look and decides.

## Size

A file ≤ 200 lines, a component ≤ 80. A block that grows splits into parts beside it in its folder, each still reading its own requests where it needs data.
