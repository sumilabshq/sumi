import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import type { ReferenceNote } from "../../../../schemas/design.schema.js";
import { placedNotes } from "../../lib/note-layout.js";
import type { PlacedNote } from "../../lib/note-layout.js";

export interface Line {
	readonly from: readonly [number, number];
	readonly to: readonly [number, number];
	readonly tone: ReferenceNote["tone"];
}

export interface Laid {
	readonly placed: readonly PlacedNote[];
	readonly lines: readonly Line[];
	readonly height: number;
}

interface Measured {
	readonly picture: HTMLImageElement;
	readonly columns: readonly (HTMLElement | null)[];
}

const NOTE_GAP_PX = 16;

export function useLaidNotes(body: RefObject<HTMLDivElement | null>, notes: readonly ReferenceNote[]): Laid | null {
	const [laid, setLaid] = useState<Laid | null>(null);
	useLayoutEffect(() => {
		const held = body.current;
		if (!held) return;
		const measure = (): void => setLaid(laidIn(held, notes));
		const watcher = new ResizeObserver(measure);
		watcher.observe(held);
		measure();
		return () => watcher.disconnect();
	}, [body, notes]);
	return laid;
}

function laidIn(body: HTMLDivElement, notes: readonly ReferenceNote[]): Laid | null {
	const picture = body.querySelector("img");
	const columns = ["left", "right"].map((side) => body.querySelector<HTMLElement>(`[data-canvas-notes="${side}"]`));
	if (!picture || picture.offsetHeight === 0) return null;
	const heights = notes.map((_, at) => body.querySelector<HTMLElement>(`[data-note="${at}"]`)?.offsetHeight ?? 0);
	const placed = placedNotes(
		notes.map((note, at) => ({ at: note.at, height: heights[at] ?? 0 })),
		picture.offsetHeight,
		NOTE_GAP_PX,
	);
	const lines = notes.flatMap((note, at) => lineOf(note, placed[at], heights[at] ?? 0, { picture, columns }));
	const bottom = Math.max(picture.offsetHeight, ...placed.map((place, at) => place.top + (heights[at] ?? 0)));
	return { placed, lines, height: bottom };
}

function lineOf(
	note: ReferenceNote,
	place: PlacedNote | undefined,
	height: number,
	{ picture, columns }: Measured,
): Line[] {
	const column = columns[place?.side === "left" ? 0 : 1];
	if (!note.at || !place || !column) return [];
	const edge = place.side === "left" ? column.offsetLeft + column.offsetWidth : column.offsetLeft;
	const from: [number, number] = [edge, column.offsetTop + place.top + height / 2];
	const to: [number, number] = [
		picture.offsetLeft + note.at[0] * picture.offsetWidth,
		picture.offsetTop + note.at[1] * picture.offsetHeight,
	];
	return [{ from, to, tone: note.tone }];
}
