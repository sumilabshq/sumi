import { FLUENT_3D_EMOJIS, FLUENT_3D_SHEET_SIDE, FLUENT_3D_SHEET_URLS } from "./fluent-3d-table";
import type { Fluent3dEmoji } from "./fluent-3d-table";

export interface Fluent3dCell {
	readonly emoji: Fluent3dEmoji;
	readonly sheetUrl: string;
	readonly column: number;
	readonly row: number;
}

const CELLS_PER_SHEET = FLUENT_3D_SHEET_SIDE * FLUENT_3D_SHEET_SIDE;
const VARIATION_SELECTOR = /️/g;

let placeByGlyph: ReadonlyMap<string, number> | null = null;

export function fluentEmojiChoices(): readonly Fluent3dEmoji[] {
	return FLUENT_3D_EMOJIS;
}

export function hasFluentEmoji(glyph: string): boolean {
	return placeOf(glyph) !== undefined;
}

export function fluentCellOf(glyph: string): Fluent3dCell | null {
	const place = placeOf(glyph);
	if (place === undefined) {
		return null;
	}

	const emoji = FLUENT_3D_EMOJIS[place];
	const sheetUrl = FLUENT_3D_SHEET_URLS[Math.floor(place / CELLS_PER_SHEET)];
	if (emoji === undefined || sheetUrl === undefined) {
		return null;
	}

	const cell = place % CELLS_PER_SHEET;
	return {
		emoji,
		sheetUrl: sheetUrl(),
		column: cell % FLUENT_3D_SHEET_SIDE,
		row: Math.floor(cell / FLUENT_3D_SHEET_SIDE),
	};
}

function placeOf(glyph: string): number | undefined {
	placeByGlyph ??= new Map(FLUENT_3D_EMOJIS.map((emoji, place) => [bareGlyphOf(emoji.glyph), place]));
	return placeByGlyph.get(bareGlyphOf(glyph));
}

function bareGlyphOf(glyph: string): string {
	return glyph.replace(VARIATION_SELECTOR, "");
}
