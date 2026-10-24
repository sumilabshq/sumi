import { useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import type { MenuSpot } from "../../../shared/lib/menu-spot.js";
import type { SlashName } from "../../../shared/schema/slash-command.schema.js";
import { ClearChatCommand, CompactChatCommand, SlashCommandsQuery } from "../contract.js";
import { slashMatchesOf } from "./slash-matches.js";

export interface SlashMenuAsk {
	readonly draft: string;
	readonly fill: (text: string) => void;
	readonly box: RefObject<HTMLTextAreaElement | null>;
}

export interface SlashMenu {
	readonly isOpen: boolean;
	readonly matches: readonly SlashName[];
	readonly active: SlashName | null;
	readonly spot: MenuSpot | null;
	readonly run: (name: SlashName) => void;
	readonly dismiss: () => void;
	readonly takesKey: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;
}

interface SlashHeld {
	readonly draft: string;
	readonly at: number;
	readonly isDismissed: boolean;
}

const NO_MATCHES: readonly SlashName[] = [];
const ABOVE_FIELD_PX = 4;

export function useSlashMenu({ draft, fill, box }: SlashMenuAsk): SlashMenu {
	const { data: names } = useQuery(SlashCommandsQuery);
	const clear = useCommand(ClearChatCommand);
	const compact = useCommand(CompactChatCommand);
	const [held, setHeld] = useState<SlashHeld>({
		draft: "",
		at: 0,
		isDismissed: false,
	});
	const current = held.draft === draft ? held : { draft, at: 0, isDismissed: false };
	const found = slashMatchesOf(names, draft);
	const isOpen = found !== null && !current.isDismissed;
	const matches = isOpen ? found : NO_MATCHES;
	const active = matches[current.at % Math.max(matches.length, 1)] ?? null;
	const dismiss = (): void => setHeld({ ...current, isDismissed: true });
	const run = (name: SlashName): void => {
		fill("");
		const ran = name === "clear" ? clear.run() : compact.run();
		void ran.then((answer) => {
			if (!answer.ok) {
				fill(draft);
			}
		});
	};
	const move = (step: number): void =>
		setHeld({ ...current, at: (current.at + step + matches.length) % matches.length });
	return {
		isOpen,
		matches,
		active,
		spot: isOpen ? spotAbove(box.current) : null,
		run,
		dismiss,
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

			return takesMenuKey(event, { active, run, move, fill });
		},
	};
}

interface MenuKeys {
	readonly active: SlashName;
	readonly run: (name: SlashName) => void;
	readonly move: (step: number) => void;
	readonly fill: (text: string) => void;
}

function takesMenuKey(event: KeyboardEvent<HTMLTextAreaElement>, { active, run, move, fill }: MenuKeys): boolean {
	if (event.key === "ArrowDown" || event.key === "ArrowUp") {
		event.preventDefault();
		move(event.key === "ArrowDown" ? 1 : -1);
		return true;
	}

	if (event.key === "Tab") {
		event.preventDefault();
		fill(`/${active}`);
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
	const field = box?.parentElement;
	if (!field) {
		return null;
	}

	const { left, top } = field.getBoundingClientRect();
	return { x: left, y: top - ABOVE_FIELD_PX };
}
