import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { DropSlot } from "@widgetarium/behaviors";

export type DropLineInset = "row" | "rail";

const LINE =
	"cv:pointer-events-none cv:absolute cv:z-[2] cv:h-[3px] cv:rounded-full cv:bg-brand cv:transition-[top] cv:duration-150 cv:ease-standard cv:before:absolute cv:before:-start-1 cv:before:top-1/2 cv:before:size-[9px] cv:before:-translate-y-1/2 cv:before:rounded-full cv:before:bg-brand cv:before:content-['']";
const INSET: Readonly<Record<DropLineInset, string>> = {
	row: `${LINE} cv:inset-x-3.5`,
	rail: `${LINE} cv:inset-x-3`,
};
const LINE_HALF_PX = 1.5;

export function TabDropLine({
	slot,
	inset,
}: {
	readonly slot: DropSlot | null;
	readonly inset: DropLineInset;
}): ReactElement | null {
	if (!slot) {
		return null;
	}

	return (
		<span
			aria-hidden="true"
			className={INSET[inset]}
			style={{ top: slot.top + slot.height / 2 - LINE_HALF_PX }}
			data-host-drop-line=""
		/>
	);
}
