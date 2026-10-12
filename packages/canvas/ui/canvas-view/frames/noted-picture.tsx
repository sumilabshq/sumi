import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import type { DrawnReference, ReferenceNote } from "../../../schemas/design.schema.js";
import { useLaidNotes } from "../hooks/frames/use-laid-notes.js";
import type { Line } from "../hooks/frames/use-laid-notes.js";
import type { NoteSide, PlacedNote } from "../lib/note-layout.js";

export interface WidgetOpener {
	readonly open: (widget: string) => void;
	readonly nameOf: (widget: string) => string;
}

const OPEN_WIDGET = "{name} ↗";
const TONE_SAID: Readonly<Record<ReferenceNote["tone"], string>> = {
	take: "Take",
	like: "Like",
	dislike: "Leave",
	note: "Note",
};
const TONE_WASH: Readonly<Record<ReferenceNote["tone"], string>> = {
	take: "cv:bg-success-wash",
	like: "cv:bg-info-wash",
	dislike: "cv:bg-error-wash",
	note: "cv:bg-warning-wash",
};
const SIDES: readonly NoteSide[] = ["left", "right"];

export function NotedPicture({
	reference,
	opener,
}: {
	readonly reference: DrawnReference;
	readonly opener: WidgetOpener;
}): ReactElement {
	const body = useRef<HTMLDivElement | null>(null);
	const laid = useLaidNotes(body, reference.notes);
	const [left, right] = SIDES.map((side) => (
		<div key={side} className="cv:relative" data-canvas-notes={side} style={{ height: laid?.height ?? 0 }}>
			{reference.notes.map((note, at) => noteOf(note, at, laid?.placed[at], side, opener))}
		</div>
	));
	return (
		<div className="cv:relative cv:grid cv:grid-cols-[280px_auto_280px] cv:items-start cv:gap-12" ref={body}>
			{left}
			<img
				className="cv:h-[540px] cv:w-auto cv:max-w-none cv:rounded-2xl cv:ring-1 cv:ring-edge"
				src={reference.src}
				alt={reference.why ?? reference.name}
				draggable={false}
			/>
			{right}
			<svg
				className="cv:pointer-events-none cv:absolute cv:inset-0 cv:h-full cv:w-full cv:overflow-visible"
				aria-hidden
			>
				{laid?.lines.map(lineDrawnOf)}
			</svg>
		</div>
	);
}

function noteOf(
	note: ReferenceNote,
	at: number,
	place: PlacedNote | undefined,
	side: NoteSide,
	opener: WidgetOpener,
): ReactElement | null {
	const isHere = place ? place.side === side : side === "right";
	if (!isHere) return null;
	return (
		<div
			key={at}
			className={`cv:absolute cv:inset-x-0 cv:flex cv:flex-col cv:gap-1 cv:rounded-md cv:px-4 cv:py-3.5 cv:text-lg cv:leading-[1.4] cv:text-ink cv:odd:-rotate-1 cv:even:rotate-1 ${TONE_WASH[note.tone]}`}
			data-note={at}
			style={place ? { top: place.top } : { visibility: "hidden" }}
		>
			<b className="cv:text-base cv:uppercase cv:tracking-[0.04em] cv:text-muted-foreground">{TONE_SAID[note.tone]}</b>
			<span>{note.text}</span>
			{note.into ? widgetButtonOf(note.into, opener) : null}
		</div>
	);
}

function lineDrawnOf(line: Line, at: number): ReactElement {
	return (
		<line
			key={at}
			className="cv:stroke-[var(--wg-kit-text-muted)] cv:[stroke-dasharray:4_4] cv:[stroke-width:1.5]"
			x1={line.from[0]}
			y1={line.from[1]}
			x2={line.to[0]}
			y2={line.to[1]}
		/>
	);
}

function widgetButtonOf(widget: string, opener: WidgetOpener): ReactElement {
	return (
		<button
			type="button"
			className="cv:mt-1 cv:cursor-pointer cv:self-start cv:rounded-full cv:border-0 cv:bg-page cv:px-2.5 cv:py-1 cv:text-base cv:font-semibold cv:text-ink cv:shadow-none cv:transition-colors cv:hover:bg-fill cv:focus-visible:bg-fill cv:focus-visible:outline-none"
			onClick={() => opener.open(widget)}
			data-canvas-note-widget=""
		>
			{OPEN_WIDGET.replace("{name}", opener.nameOf(widget))}
		</button>
	);
}
