import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";
import type { LayoutParts } from "./layout-parts.gateway.js";
import { layoutPartsOf } from "./memory.gateway.js";

interface HeldValue<T> {
	read(): T | null;
	write(value: T): void;
}

export function serverLayoutParts(): LayoutParts {
	return layoutPartsOf({
		widths: {
			left: heldValue<number>(),
			chat: heldValue<number>(),
		},
		sides: {
			left: heldValue<boolean>(),
			right: heldValue<boolean>(),
		},
		panes: heldValue<PaneTree>(),
	});
}

function heldValue<T>(): HeldValue<T> {
	let held: T | null = null;
	return {
		read: () => held,
		write: (value) => {
			held = value;
		},
	};
}
