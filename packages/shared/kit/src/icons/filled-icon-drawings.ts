import { FILLED_ICON_TABLE, FILLED_ICON_WORDS } from "./filled-icon-table";

export interface FilledIconChoice {
	readonly name: string;
	readonly words: string;
}

let everyFilledIconChoice: readonly FilledIconChoice[] | null = null;

export function filledIconBodyOf(name: string): string | null {
	return Object.hasOwn(FILLED_ICON_TABLE, name) ? (FILLED_ICON_TABLE[name] ?? null) : null;
}

export function hasFilledIcon(name: string): boolean {
	return filledIconBodyOf(name) !== null;
}

export function filledIconChoices(): readonly FilledIconChoice[] {
	everyFilledIconChoice ??= Object.keys(FILLED_ICON_TABLE).map((name) => ({
		name,
		words: Object.hasOwn(FILLED_ICON_WORDS, name) ? (FILLED_ICON_WORDS[name] ?? name) : name,
	}));
	return everyFilledIconChoice;
}
