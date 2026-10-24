import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { placedNotes } from "./placed-notes.js";
import type { NoteSide, PlacedNote } from "./placed-notes.js";

export interface Callout {
	readonly at?: readonly [number, number] | undefined;
}

export interface CalloutLine {
	readonly from: readonly [number, number];
	readonly to: readonly [number, number];
}

export interface LaidCallouts {
	readonly placed: readonly PlacedNote[];
	readonly lines: readonly CalloutLine[];
	readonly height: number;
}

interface Measured {
	readonly picture: HTMLImageElement;
	readonly columns: readonly (HTMLElement | null)[];
}

export const CALLOUT_COLUMN = "data-callout-column";
export const CALLOUT = "data-callout";

const GAP_PX = 16;
const SIDES: readonly NoteSide[] = ["left", "right"];

export function useLaidCallouts(
	body: RefObject<HTMLElement | null>,
	callouts: readonly Callout[],
): LaidCallouts | null {
	const [laid, setLaid] = useState<LaidCallouts | null>(null);
	useLayoutEffect(() => {
		const held = body.current;
		if (!held) return;
		const measure = (): void => setLaid(laidIn(held, callouts));
		const watcher = new ResizeObserver(measure);
		watcher.observe(held);
		measure();
		return () => watcher.disconnect();
	}, [body, callouts]);
	return laid;
}

function laidIn(body: HTMLElement, callouts: readonly Callout[]): LaidCallouts | null {
	const picture = body.querySelector("img");
	const columns = SIDES.map((side) => body.querySelector<HTMLElement>(`[${CALLOUT_COLUMN}="${side}"]`));
	if (!picture || picture.offsetHeight === 0) return null;
	const heights = callouts.map((_, at) => body.querySelector<HTMLElement>(`[${CALLOUT}="${at}"]`)?.offsetHeight ?? 0);
	const placed = placedNotes(
		callouts.map((callout, at) => ({ at: callout.at, height: heights[at] ?? 0 })),
		picture.offsetHeight,
		GAP_PX,
	);
	const lines = callouts.flatMap((callout, at) => lineOf(callout, placed[at], heights[at] ?? 0, { picture, columns }));
	const bottom = Math.max(picture.offsetHeight, ...placed.map((place, at) => place.top + (heights[at] ?? 0)));
	return { placed, lines, height: bottom };
}

function lineOf(
	callout: Callout,
	place: PlacedNote | undefined,
	height: number,
	{ picture, columns }: Measured,
): CalloutLine[] {
	const column = columns[place?.side === "left" ? 0 : 1];
	if (!callout.at || !place || !column) return [];
	const edge = place.side === "left" ? column.offsetLeft + column.offsetWidth : column.offsetLeft;
	const from: [number, number] = [edge, column.offsetTop + place.top + height / 2];
	const to: [number, number] = [
		picture.offsetLeft + callout.at[0] * picture.offsetWidth,
		picture.offsetTop + callout.at[1] * picture.offsetHeight,
	];
	return [{ from, to }];
}
