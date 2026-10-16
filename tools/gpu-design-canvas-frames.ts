import { states as taskStates } from "./studio-fixture-widget.tsx";

export interface DesignFrame {
	readonly state: string;
	readonly widget: string;
	readonly props: Readonly<Record<string, unknown>>;
}

export const DESIGN_SCREEN = "Harvest";
export const TAGS_FRAME = "Log 1";
export const TASKS_FRAME = "Tasks 1";
export const KIT_FRAME = "Seeds 1";
export const BROKEN_FRAME = "Broken";
export const TASKS_WIDGET = "task-list";
export const TASKS_CARD = "Full";

const COPIES = { log: 7, tasks: 6, seeds: 6 } as const;

export const DESIGN_FRAMES: readonly DesignFrame[] = [
	...copiesOf("Log", COPIES.log, "fixture-tags", () => ({})),
	...copiesOf("Tasks", COPIES.tasks, "task-list", (at) => (at % 2 === 0 ? taskStates.Full : taskStates.Empty)),
	...copiesOf("Seeds", COPIES.seeds, "kit-panel", () => ({})),
	{ state: BROKEN_FRAME, widget: "broken", props: {} },
];

function copiesOf(
	name: string,
	count: number,
	widget: string,
	propsAt: (at: number) => Readonly<Record<string, unknown>>,
): DesignFrame[] {
	return Array.from({ length: count }, (_, at) => ({ state: `${name} ${at + 1}`, widget, props: propsAt(at) }));
}
