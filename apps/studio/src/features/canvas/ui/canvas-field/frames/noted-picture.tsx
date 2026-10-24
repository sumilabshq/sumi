import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { CALLOUT_COLUMN, useLaidCallouts } from "@widgetarium/behaviors";
import type { NoteSide } from "@widgetarium/behaviors";
import type { ReferenceShown } from "@widgetarium/canvas";
import { CalloutNote } from "./callout-note.js";

const SIDES: readonly NoteSide[] = ["left", "right"];

export function NotedPicture({ reference }: { readonly reference: ReferenceShown }): ReactElement {
	const body = useRef<HTMLDivElement | null>(null);
	const laid = useLaidCallouts(body, reference.callouts);
	const [left, right] = SIDES.map((side) => (
		<div key={side} className="cv:relative" {...{ [CALLOUT_COLUMN]: side }} style={{ height: laid?.height ?? 0 }}>
			{reference.callouts.map((callout, at) => (
				<CalloutNote key={at} callout={callout} at={at} place={laid?.placed[at]} side={side} />
			))}
		</div>
	));
	return (
		<div className="cv:relative cv:grid cv:grid-cols-[280px_auto_280px] cv:items-start cv:gap-12" ref={body}>
			{left}
			<img
				className="cv:h-[540px] cv:w-auto cv:max-w-none cv:rounded-2xl cv:ring-1 cv:ring-edge"
				src={reference.src}
				alt={reference.alt}
				draggable={false}
			/>
			{right}
			<svg
				className="cv:pointer-events-none cv:absolute cv:inset-0 cv:h-full cv:w-full cv:overflow-visible"
				aria-hidden
			>
				{laid?.lines.map((line, at) => (
					<line
						key={at}
						className="cv:stroke-[var(--wg-kit-text-muted)] cv:[stroke-dasharray:4_4] cv:[stroke-width:1.5]"
						x1={line.from[0]}
						y1={line.from[1]}
						x2={line.to[0]}
						y2={line.to[1]}
					/>
				))}
			</svg>
		</div>
	);
}
