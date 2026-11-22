import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/data-framework";
import { CALLOUT } from "@widgetarium/behaviors";
import type { NoteSide, PlacedNote } from "@widgetarium/behaviors";
import { canvas } from "@widgetarium/canvas/contract";
import type { CalloutShown } from "@widgetarium/canvas/contract";

export interface CalloutNoteProps {
	readonly callout: CalloutShown;
	readonly at: number;
	readonly place: PlacedNote | undefined;
	readonly side: NoteSide;
}

const OPEN_WIDGET = "{name} ↗";
const TONE_SAID: Readonly<Record<CalloutShown["tone"], string>> = {
	take: "Take",
	like: "Like",
	dislike: "Leave",
	note: "Note",
};
const TONE_WASH: Readonly<Record<CalloutShown["tone"], string>> = {
	take: "cv:bg-success-wash",
	like: "cv:bg-info-wash",
	dislike: "cv:bg-error-wash",
	note: "cv:bg-warning-wash",
};
const WIDGET_BUTTON = "cv:mt-1 cv:self-start";

export function CalloutNote({ callout, at, place, side }: CalloutNoteProps): ReactElement | null {
	const focus = useCommand(canvas.pages.focusWidget);
	const isHere = place ? place.side === side : side === "right";
	if (!isHere) return null;
	return (
		<div
			className={`cv:absolute cv:inset-x-0 cv:flex cv:flex-col cv:gap-1 cv:px-4 cv:py-3.5 cv:text-lg cv:leading-[1.4] cv:text-ink cv:odd:-rotate-1 cv:even:rotate-1 ${TONE_WASH[callout.tone]}`}
			{...{ [CALLOUT]: at }}
			style={place ? { top: place.top } : { visibility: "hidden" }}
		>
			<b className="cv:text-base cv:text-muted-foreground">{TONE_SAID[callout.tone]}</b>
			<span>{callout.text}</span>
			{callout.widget ? (
				<Button
					size="s"
					className={WIDGET_BUTTON}
					onClick={() => callout.widget && void focus.run({ widget: callout.widget.id })}
					data-canvas-note-widget=""
				>
					{OPEN_WIDGET.replace("{name}", callout.widget.name)}
				</Button>
			) : null}
		</div>
	);
}
