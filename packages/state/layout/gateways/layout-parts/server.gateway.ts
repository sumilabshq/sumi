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
