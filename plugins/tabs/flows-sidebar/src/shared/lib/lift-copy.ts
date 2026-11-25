import type { DragEvent } from "react";

const LIFTED = "sumi-flows-lifted";

export function liftCopyOf(event: DragEvent): void {
	const source = event.currentTarget;

	if (!(source instanceof HTMLElement)) {
		return;
	}

	const box = source.getBoundingClientRect();
	const copy = source.cloneNode(true);

	if (!(copy instanceof HTMLElement)) {
		return;
	}

	copy.classList.add(LIFTED);
	copy.style.width = `${box.width}px`;
	source.after(copy);
	event.dataTransfer.setDragImage(copy, event.clientX - box.left, event.clientY - box.top);
	requestAnimationFrame(() => copy.remove());
}
