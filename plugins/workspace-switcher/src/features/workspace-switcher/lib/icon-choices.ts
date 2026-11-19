import { FILLED_ICONS } from "./filled-icons.js";

export interface IconChoice {
	readonly name: string;
	readonly words: string;
}

const ICON_CHOICES: readonly IconChoice[] = Object.keys(FILLED_ICONS).map((name) => ({
	name,
	words: name.replaceAll("-", " "),
}));

export function iconChoicesOf(typed: string): readonly IconChoice[] {
	const asked = typed.trim().toLowerCase();
	if (asked === "") {
		return ICON_CHOICES;
	}

	return ICON_CHOICES.filter((choice) => choice.words.includes(asked));
}
