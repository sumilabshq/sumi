import type { DragSource } from "./sidebar-drop-plan.js";

export interface PickedItem {
	readonly element: HTMLElement;
	readonly source: DragSource;
	readonly opensOwnWindow: boolean;
}
