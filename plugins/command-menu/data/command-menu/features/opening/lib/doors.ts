import type { FilledDoor } from "../../../shared/host/command-menu.host.js";

const NO_SUCH_DOOR = "the command menu has no door {door}: no plugin filled it";

export function refuseDoor(door: string, doors: readonly FilledDoor[]): string | null {
	return doors.some(({ id }) => id === door) ? null : NO_SUCH_DOOR.replace("{door}", door);
}

export function doorKeysOf(letter: string): string {
	return `⌘${letter.toUpperCase()}`;
}
