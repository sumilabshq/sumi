import type { MenuDoor } from "@sumi/command-menu";

const IN_MENU_ALIASES: Readonly<Partial<Record<string, string>>> = {
	t: "new-tab",
};

export function doorOfLetter(letter: string, doors: readonly MenuDoor[]): MenuDoor | undefined {
	return doors.find((door) => door.letter === letter);
}

export function doorOfMenuLetter(letter: string, doors: readonly MenuDoor[]): string | undefined {
	return doorOfLetter(letter, doors)?.id ?? IN_MENU_ALIASES[letter];
}
