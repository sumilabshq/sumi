import { useEffect } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import type { ComposerInput } from "@sumi/chat-plugin";
import { latestTitleAskOf, titleIn } from "../../../shared/lib/title-ask.js";
import { useTitleKeeper } from "../../../shared/lib/title-keeper.js";
import type { TitleKeeper } from "../../../shared/lib/title-keeper.js";
import { renameTypedIn } from "./rename-typed.js";

type QuickAsk = (
	prompt: string,
) => Promise<
	{ readonly ok: true; readonly output: { readonly said: string } } | { readonly ok: false; readonly reason: string }
>;

export function useRenameCommand(input: ComposerInput): void {
	const { box, chatId, draft, replaceDraft } = input;
	const chat = useOptionalQuery(assistant.chat.one, { chat: chatId }).data;
	const quickAsk = useCommand(assistant.chat.quickAsk);
	const keeper = useTitleKeeper();
	const typed = renameTypedIn(draft);
	const ask = chat === null ? null : latestTitleAskOf(chat);

	useEffect(() => {
		const field = box.current;

		if (field === null || chatId === null || typed === null) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			replaceDraft("", 0);
			void renameChat({
				chatId,
				title: typed.title,
				ask,
				keeper,
				quickAsk: (prompt) => quickAsk.run({ chat: chatId, prompt }),
			});
		};
		field.addEventListener("keydown", onKeyDown);
		return () => field.removeEventListener("keydown", onKeyDown);
	}, [box, chatId, typed, ask, keeper, quickAsk, replaceDraft]);
}

interface Renaming {
	readonly chatId: string;
	readonly title: string | null;
	readonly ask: string | null;
	readonly keeper: TitleKeeper;
	readonly quickAsk: QuickAsk;
}

async function renameChat({ chatId, title, ask, keeper, quickAsk }: Renaming): Promise<void> {
	if (title !== null) {
		await keeper.name(chatId, title, "person");
		return;
	}

	if (ask === null) {
		console.info(`[widgetarium] /rename of chat ${chatId} skipped: nothing said yet to name it by`);
		return;
	}

	const answer = await quickAsk(ask);
	const named = answer.ok ? titleIn(answer.output.said) : null;

	if (named === null) {
		console.info(`[widgetarium] /rename of chat ${chatId} skipped: ${answer.ok ? "empty answer" : answer.reason}`);
		return;
	}

	await keeper.name(chatId, named, "person");
}
