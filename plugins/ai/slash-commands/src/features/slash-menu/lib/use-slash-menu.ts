import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import type { ComposerInput } from "@sumi/chat-plugin";
import { commandPiecesOf, slashEntriesOf, slashQueryAt } from "./slash-matches.js";
import type { CommandPiece, RunSlashName, SlashEntry, SlashQuery } from "./slash-matches.js";

export interface SlashMenu {
	readonly matches: readonly SlashEntry[];
	readonly active: SlashEntry | null;
	readonly isOpen: boolean;
	readonly pieces: readonly CommandPiece[] | null;
	readonly run: (entry: SlashEntry) => void;
}

interface MenuMemory {
	readonly draft: string;
	readonly at: number;
	readonly isDismissed: boolean;
}

interface MenuKeyActions {
	readonly active: SlashEntry;
	readonly run: (entry: SlashEntry) => void;
	readonly insert: (entry: SlashEntry) => void;
	readonly move: (step: number) => void;
	readonly dismiss: () => void;
}

type CommandRun = (chatId: string | null) => Promise<{ readonly ok: boolean }>;

const NO_MATCHES: readonly SlashEntry[] = [];

export function useSlashMenu(input: ComposerInput): SlashMenu {
	const { chatId, draft, box } = input;
	const names = useOptionalQuery(assistant.slashCommands.all, { chat: chatId }).data ?? [];
	const commandRuns = useCommandRuns();
	const [memory, remember] = useState(() => memoryFor(""));
	const entries = slashEntriesOf(names);
	const current = memory.draft === draft ? memory : memoryFor(draft);
	const query = slashQueryAt(entries, draft, useLastKnownCaret(box, draft));
	const isOpen = query !== null && !current.isDismissed;
	const matches = isOpen ? query.matches : NO_MATCHES;
	const active = matches[current.at % Math.max(matches.length, 1)] ?? null;
	const { insert, run } = entryActionsOf(input, query, commandRuns);
	const keyActions = useRef<MenuKeyActions | null>(null);
	keyActions.current =
		active === null
			? null
			: {
					active,
					run,
					insert,
					move: (step) => remember({ ...current, at: (current.at + step + matches.length) % matches.length }),
					dismiss: () => remember({ ...current, isDismissed: true }),
				};
	useTakesMenuKeys(input, keyActions);
	useDismissesOnPressOutside(input, (isInside) => remember({ ...current, isDismissed: !isInside }));
	return {
		matches,
		active,
		isOpen,
		pieces: commandPiecesOf(entries, draft),
		run,
	};
}

function entryActionsOf(
	input: ComposerInput,
	query: SlashQuery | null,
	commandRuns: Readonly<Record<RunSlashName, CommandRun>>,
): Pick<MenuKeyActions, "insert" | "run"> {
	const insert = (entry: SlashEntry): void => {
		if (query !== null) {
			insertEntry(entry, query, input);
		}
	};
	const run = (entry: SlashEntry): void => {
		if (entry.kind !== "command") {
			insert(entry);
			return;
		}

		input.replaceDraft("", 0);
		void commandRuns[entry.name](input.chatId).then((answer) => {
			if (!answer.ok) {
				input.replaceDraft(input.draft, input.draft.length);
			}
		});
	};
	return {
		insert,
		run,
	};
}

function memoryFor(draft: string): MenuMemory {
	return {
		draft,
		at: 0,
		isDismissed: false,
	};
}

function useCommandRuns(): Readonly<Record<RunSlashName, CommandRun>> {
	const clear = useCommand(assistant.composer.clearChat);
	const compact = useCommand(assistant.slashCommands.compactChat);
	return {
		clear: (chatId) => clear.run({ chat: chatId }),
		compact: (chatId) => compact.run({ chat: chatId }),
	};
}

function insertEntry(entry: SlashEntry, query: SlashQuery, { draft, replaceDraft }: ComposerInput): void {
	const word = `/${entry.name} `;
	replaceDraft(`${draft.slice(0, query.start)}${word}${draft.slice(query.end).trimStart()}`, query.start + word.length);
}

function useTakesMenuKeys({ keyTaker }: ComposerInput, keyActions: RefObject<MenuKeyActions | null>): void {
	useEffect(() => {
		keyTaker.current = (event) => {
			const actions = keyActions.current;
			return actions !== null && handleMenuKey(event, actions);
		};
		return () => {
			keyTaker.current = null;
		};
	}, [keyTaker, keyActions]);
}

function handleMenuKey(event: KeyboardEvent<HTMLTextAreaElement>, actions: MenuKeyActions): boolean {
	if (event.key === "Enter" && event.shiftKey) {
		return false;
	}

	const action = actionByKeyOf(actions)[event.key];

	if (action === undefined) {
		return false;
	}

	action();
	return true;
}

function actionByKeyOf(actions: MenuKeyActions): Readonly<Record<string, () => void>> {
	return {
		ArrowDown: () => actions.move(1),
		ArrowUp: () => actions.move(-1),
		Tab: () => actions.insert(actions.active),
		Enter: () => actions.run(actions.active),
		Escape: actions.dismiss,
	};
}

function useDismissesOnPressOutside({ field, above }: ComposerInput, pressed: (isInside: boolean) => void): void {
	const latestPressed = useRef(pressed);
	latestPressed.current = pressed;
	useEffect(() => {
		const press = (event: PointerEvent): void => {
			const target = event.target;
			latestPressed.current(
				target instanceof Node && [field.current, above.current].some((part) => part?.contains(target) === true),
			);
		};
		document.addEventListener("pointerdown", press, true);
		return () => document.removeEventListener("pointerdown", press, true);
	}, [field, above]);
}

// TRADE-OFF: reads the caret in render; the chat keeps no caret state to hand over
function useLastKnownCaret(box: RefObject<HTMLTextAreaElement | null>, draft: string): number {
	const lastCaret = useRef(draft.length);
	const live = box.current?.selectionEnd ?? draft.length;

	if (live > 0 || draft === "") {
		lastCaret.current = live;
	}

	return Math.min(lastCaret.current, draft.length);
}
