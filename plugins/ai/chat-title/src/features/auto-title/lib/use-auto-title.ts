import { useEffect, useRef } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { titleAskOf, titleIn } from "../../../shared/lib/title-ask.js";
import { useTitleKeeper } from "../../../shared/lib/title-keeper.js";

export function useAutoTitle(chatId: string | null): void {
	const chat = useOptionalQuery(assistant.chat.one, { chat: chatId }).data;
	const quickAsk = useCommand(assistant.chat.quickAsk);
	const keeper = useTitleKeeper();
	const asked = useRef(new Set<string>());
	const ask = chat === null ? null : titleAskOf(chat);

	useEffect(() => {
		if (chatId === null || ask === null || asked.current.has(chatId)) {
			return;
		}

		asked.current.add(chatId);
		void nameChat({ chatId, ask, keeper, quickAsk: (prompt) => quickAsk.run({ chat: chatId, prompt }) });
	}, [chatId, ask, keeper, quickAsk]);
}

interface Naming {
	readonly chatId: string;
	readonly ask: string;
	readonly keeper: ReturnType<typeof useTitleKeeper>;
	readonly quickAsk: (prompt: string) => Promise<QuickAnswer>;
}

type QuickAnswer =
	{ readonly ok: true; readonly output: { readonly said: string } } | { readonly ok: false; readonly reason: string };

async function nameChat({ chatId, ask, keeper, quickAsk }: Naming): Promise<void> {
	if (!(await keeper.isAskedTitle(chatId))) {
		return;
	}

	const answer = await quickAsk(ask);
	const title = answer.ok ? titleIn(answer.output.said) : null;

	if (title === null) {
		console.info(`[widgetarium] auto title of chat ${chatId} skipped: ${answer.ok ? "empty answer" : answer.reason}`);
		return;
	}

	await keeper.name(chatId, title, "auto");
}
