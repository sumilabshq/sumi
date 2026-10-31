import { DoorSchema } from "@widgetarium/command-menu";
import type { Door } from "@widgetarium/command-menu";

const DOOR_LETTERS: Readonly<Record<Door, string>> = {
	anywhere: "k",
	"new-tab": "n",
	ask: "i",
	"this-tab": "l",
};
const IN_MENU_ALIASES: Readonly<Partial<Record<string, Door>>> = {
	t: "new-tab",
};

export function doorKeysOf(door: Door): string {
	return `⌘${DOOR_LETTERS[door].toUpperCase()}`;
}

export function doorOfLetter(letter: string): Door | undefined {
	return DoorSchema.options.find((door) => DOOR_LETTERS[door] === letter);
}

export function doorOfMenuLetter(letter: string): Door | undefined {
	return doorOfLetter(letter) ?? IN_MENU_ALIASES[letter];
}

export const OPEN_MENU_KEYS = doorKeysOf("anywhere");
