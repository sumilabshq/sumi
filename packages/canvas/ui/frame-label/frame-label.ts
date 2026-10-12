import type { DrawnScreen } from "../../schemas/design.schema.js";

export function frameLabelOf(screen: DrawnScreen, state: string): string {
	return screen.states.length < 2 || state === screen.name ? screen.name : `${screen.name} · ${state}`;
}
