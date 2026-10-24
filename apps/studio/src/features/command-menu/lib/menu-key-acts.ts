import type { KeyboardEvent } from "react";
import type { Door, Intent, Results, Scope } from "@widgetarium/command-menu";
import type { MenuMoves } from "./use-menu-moves.js";

export interface KeyedMenu {
	readonly door: Door;
	readonly text: string;
	readonly setText: (text: string) => void;
	readonly setScope: (scope: Scope) => void;
	readonly results: Results;
	readonly moves: MenuMoves;
	readonly toDoor: (door: Door) => void;
	readonly close: () => void;
}

type MenuKey = KeyboardEvent<HTMLElement>;

type KeyAct = (event: MenuKey, menu: KeyedMenu) => boolean;

const SCOPE_KEYS: Readonly<Record<string, Scope>> = {
	"1": "all",
	"2": "tabs",
	"3": "chats",
	"4": "apps",
	"5": "workspaces",
};
const DOOR_KEYS: Readonly<Record<string, Door>> = {
	k: "anywhere",
	t: "new-tab",
	l: "this-tab",
};

export const MENU_KEY_ACTS: readonly KeyAct[] = [
	stepped,
	entered,
	completed,
	actionsToggled,
	renamed,
	tabClosed,
	scoped,
	doorChanged,
	escaped,
	tokenDropped,
];

function stepped(event: MenuKey, { moves }: KeyedMenu): boolean {
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
		return false;
	}

	moves.step(event.key === "ArrowDown" ? 1 : -1);
	return true;
}

function entered(event: MenuKey, { results, moves }: KeyedMenu): boolean {
	if (event.key !== "Enter") {
		return false;
	}

	const intent = enteredIntentOf(event, results, moves);

	if (intent !== null) {
		moves.run(intent);
	}

	return true;
}

function completed(event: MenuKey, { text, setText, results, moves }: KeyedMenu): boolean {
	if (event.key !== "Tab") {
		return false;
	}

	if (results.ghost !== "") {
		moves.typed(() => setText(text + results.ghost));
	}

	return true;
}

function actionsToggled(event: MenuKey, { text, moves }: KeyedMenu): boolean {
	if (event.key === "ArrowLeft" && moves.isActing) {
		moves.setActing(false);
		return true;
	}

	if (event.key !== "ArrowRight" || !moves.hasActions || !isCaretAtEnd(event, text)) {
		return false;
	}

	moves.setActing(!moves.isActing);
	return true;
}

function renamed(event: MenuKey, { moves }: KeyedMenu): boolean {
	if (!isCommandWith(event, "r")) {
		return false;
	}

	moves.rename.start();
	return true;
}

function tabClosed(event: MenuKey, { moves }: KeyedMenu): boolean {
	if (!isCommandWith(event, "w")) {
		return false;
	}

	const closing = moves.picked?.actions.find((action) => action.intent?.do === "close-tab")?.intent ?? null;

	if (closing !== null) {
		moves.run(closing);
	}

	return true;
}

function scoped(event: MenuKey, { setScope, moves, toDoor }: KeyedMenu): boolean {
	const scope = isCommand(event) ? SCOPE_KEYS[event.key] : undefined;

	if (scope === undefined) {
		return false;
	}

	toDoor("anywhere");
	moves.typed(() => setScope(scope));
	return true;
}

function doorChanged(event: MenuKey, menu: KeyedMenu): boolean {
	const door = isCommand(event) ? DOOR_KEYS[event.key.toLowerCase()] : undefined;

	if (door === undefined) {
		return false;
	}

	if (door === menu.door) {
		menu.close();
		return true;
	}

	menu.toDoor(door);
	return true;
}

function escaped(event: MenuKey, { door, text, setText, moves, toDoor, close }: KeyedMenu): boolean {
	if (event.key !== "Escape") {
		return false;
	}

	if (moves.isActing) {
		moves.setActing(false);
		return true;
	}

	if (text !== "") {
		moves.typed(() => setText(""));
		return true;
	}

	if (door !== "anywhere") {
		toDoor("anywhere");
		return true;
	}

	close();
	return true;
}

function tokenDropped(event: MenuKey, { door, text, toDoor }: KeyedMenu): boolean {
	if (event.key !== "Backspace" || text !== "" || door === "anywhere") {
		return false;
	}

	toDoor("anywhere");
	return true;
}

function enteredIntentOf(event: MenuKey, results: Results, moves: MenuMoves): Intent | null {
	if (isCommand(event)) {
		return results.askInk;
	}

	if (event.shiftKey) {
		return results.makeNew;
	}

	return moves.picked?.intent ?? null;
}

function isCaretAtEnd(event: MenuKey, text: string): boolean {
	return !(event.target instanceof HTMLInputElement) || event.target.selectionStart === text.length;
}

function isCommandWith(event: MenuKey, letter: string): boolean {
	return isCommand(event) && event.key.toLowerCase() === letter;
}

function isCommand(event: MenuKey): boolean {
	return event.metaKey || event.ctrlKey;
}
