import { useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/framework";
import type { MenuSpot } from "./menu-spot.js";
import { slashAskOf, slashEntriesOf } from "./slash-matches.js";
import type { SlashAsk, SlashEntry } from "./slash-matches.js";
import { ClearChatCommand, CompactChatCommand, SlashCommandsQuery } from "@widgetarium/assistant";

export interface SlashMenuAsk {
	readonly draft: string;
	readonly fill: (text: string) => void;
	readonly box: RefObject<HTMLTextAreaElement | null>;
}

export interface SlashMenu {
	readonly entries: readonly SlashEntry[];
	readonly isOpen: boolean;
	readonly matches: readonly SlashEntry[];
	readonly active: SlashEntry | null;
	readonly spot: MenuSpot | null;
	readonly run: (entry: SlashEntry) => void;
	readonly dismiss: () => void;
	readonly reopen: () => void;
	readonly takesKey: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;
}

interface SlashHeld {
	readonly draft: string;
	readonly at: number;
	readonly isDismissed: boolean;
}

const NO_MATCHES: readonly SlashEntry[] = [];
const ABOVE_FIELD_PX = 4;

export function useSlashMenu({ draft, fill, box }: SlashMenuAsk): SlashMenu {
	const names = useOptionalQuery(SlashCommandsQuery).data ?? [];
	const clear = useCommand(ClearChatCommand);
	const compact = useCommand(CompactChatCommand);
	const [held, setHeld] = useState<SlashHeld>({
		draft: "",
		at: 0,
		isDismissed: false,
	});
	const entries = slashEntriesOf(names);
	const current = held.draft === draft ? held : { draft, at: 0, isDismissed: false };
	const asked = slashAskOf(entries, draft, box.current?.selectionEnd ?? draft.length);
	const isOpen = asked !== null && !current.isDismissed;
	const matches = isOpen ? asked.matches : NO_MATCHES;
	const active = matches[current.at % Math.max(matches.length, 1)] ?? null;
	const insert = (entry: SlashEntry): void => {
		if (asked === null) {
			return;
		}

		insertEntry({ entry, asked, draft, fill, box: box.current });
	};
	const run = (entry: SlashEntry): void => {
		if (entry.kind === "skill") {
			insert(entry);
			return;
		}

		fill("");
		const ran = entry.name === "clear" ? clear.run() : compact.run();
		void ran.then((answer) => {
			if (!answer.ok) {
				fill(draft);
			}
		});
	};
	const move = (step: number): void =>
		setHeld({ ...current, at: (current.at + step + matches.length) % matches.length });
	const dismiss = (): void => setHeld({ ...current, isDismissed: true });
	return {
		entries,
		isOpen,
		matches,
		active,
		spot: isOpen ? spotAbove(box.current) : null,
		run,
		dismiss,
		reopen: () => setHeld({ ...current, isDismissed: false }),
		takesKey: (event) => {
			if (!isOpen) {
				return false;
			}

			if (event.key === "Escape") {
				event.preventDefault();
				dismiss();
				return true;
			}

			if (active === null) {
				return false;
			}

			return takesMenuKey(event, { active, run, move, insert });
		},
	};
}

interface EntryInsert {
	readonly entry: SlashEntry;
	readonly asked: SlashAsk;
	readonly draft: string;
	readonly fill: (text: string) => void;
	readonly box: HTMLTextAreaElement | null;
}

function insertEntry({ entry, asked, draft, fill, box }: EntryInsert): void {
	const word = `/${entry.name} `;
	const caret = asked.start + word.length;
	fill(`${draft.slice(0, asked.start)}${word}${draft.slice(asked.end).trimStart()}`);
	requestAnimationFrame(() => box?.setSelectionRange(caret, caret));
}

interface MenuKeys {
	readonly active: SlashEntry;
	readonly run: (entry: SlashEntry) => void;
	readonly move: (step: number) => void;
	readonly insert: (entry: SlashEntry) => void;
}

function takesMenuKey(event: KeyboardEvent<HTMLTextAreaElement>, { active, run, move, insert }: MenuKeys): boolean {
	if (event.key === "ArrowDown" || event.key === "ArrowUp") {
		event.preventDefault();
		move(event.key === "ArrowDown" ? 1 : -1);
		return true;
	}

	if (event.key === "Tab") {
		event.preventDefault();
		insert(active);
		return true;
	}

	if (event.key !== "Enter" || event.shiftKey) {
		return false;
	}

	event.preventDefault();
	run(active);
	return true;
}

function spotAbove(box: HTMLTextAreaElement | null): MenuSpot | null {
	const field = box?.closest(".wg-studio-ai-field");
	if (!field) {
		return null;
	}

	const { left, top } = field.getBoundingClientRect();
	return { x: left, y: top - ABOVE_FIELD_PX };
}
