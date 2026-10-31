import type { DragSource } from "./drag-source.js";

export interface PickedItem {
	readonly element: HTMLElement;
	readonly source: DragSource;
	readonly opensOwnWindow: boolean;
}
