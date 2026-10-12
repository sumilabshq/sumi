import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { DropSlot as Slot } from "@widgetarium/behaviors";

export function DropSlot({ slot }: { readonly slot: Slot | null }): ReactElement | null {
	if (!slot) return null;
	return (
		<div
			className="cv:pointer-events-none cv:absolute cv:right-0 cv:rounded-md cv:bg-[color-mix(in_srgb,var(--wg-kit-accent)_14%,transparent)] cv:transition-[top,left,height] cv:duration-200 cv:ease-standard cv:motion-safe:animate-canvas-fade-in"
			style={{ top: slot.top, left: slot.left, height: slot.height }}
		/>
	);
}
