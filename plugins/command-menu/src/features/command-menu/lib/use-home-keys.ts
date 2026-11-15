import type { KeyboardEvent } from "react";
import type { HomePlace, Results } from "@sumi/command-menu/contract";
import type { MenuMoves } from "./use-menu-moves.js";

export interface HomeKeysAsk {
	readonly text: string;
	readonly setText: (text: string) => void;
	readonly results: Results;
	readonly moves: MenuMoves;
}

type HomeKey = KeyboardEvent<HTMLElement>;

type HomeKeyAct = (event: HomeKey, home: HomeKeysAsk) => boolean;

const HOME_KEY_ACTS: readonly HomeKeyAct[] = [stepped, entered, completed, cleared];

export function useHomeKeys(home: HomeKeysAsk): (event: HomeKey) => void {
	return (event) => {
		if (HOME_KEY_ACTS.some((act) => act(event, home))) {
			event.preventDefault();
		}
	};
}

function stepped(event: HomeKey, { moves }: HomeKeysAsk): boolean {
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
		return false;
	}

	moves.step(event.key === "ArrowDown" ? 1 : -1);
	return true;
}

function entered(event: HomeKey, { moves }: HomeKeysAsk): boolean {
	if (event.key !== "Enter") {
		return false;
	}

	if (moves.picked !== null) {
		moves.runAt(moves.picked.intent, placeOfKeys(event));
	}

	return true;
}

function completed(event: HomeKey, { text, setText, results, moves }: HomeKeysAsk): boolean {
	if (event.key !== "Tab" || results.ghost === "") {
		return false;
	}

	moves.typed(() => setText(text + results.ghost));
	return true;
}

function cleared(event: HomeKey, { text, setText, moves }: HomeKeysAsk): boolean {
	if (event.key !== "Escape" || text === "") {
		return false;
	}

	moves.typed(() => setText(""));
	return true;
}

function placeOfKeys(event: HomeKey): HomePlace {
	if (!event.metaKey && !event.ctrlKey) {
		return "here";
	}

	return event.shiftKey ? "new-window" : "new-tab";
}
