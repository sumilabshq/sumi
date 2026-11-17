import { useEffect, useRef, useState } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import type { ComposerInput } from "@sumi/chat-plugin";
import { nextPromptAskOf, nextPromptIn } from "./next-prompt-ask.js";
import { useTakesOnTab } from "./use-takes-on-tab.js";

const TAKES_IT = "⇥ Tab";
const HINT_GAP = "   ";

export function useNextPrompt(input: ComposerInput): void {
	const { chatId, draft, showHint } = input;
	const chat = useOptionalQuery(assistant.chat.one, { chat: chatId }).data;
	const quickAsk = useCommand(assistant.chat.quickAsk);
	const [suggestion, suggest] = useState<string | null>(null);
	const sawWork = useRef(false);
	const isBusy = chat?.session.busy ?? false;
	const ask = chat === null || isBusy ? null : nextPromptAskOf(chat);

	useEffect(() => {
		if (isBusy) {
			sawWork.current = true;
			suggest(null);
			return;
		}

		if (chatId === null || ask === null || !sawWork.current) {
			return;
		}

		sawWork.current = false;
		void quickAsk.run({ chat: chatId, prompt: ask }).then((answer) => {
			if (!answer.ok) {
				console.info(`[widgetarium] next prompt of chat ${chatId} skipped: ${answer.reason}`);
				return;
			}

			suggest(nextPromptIn(answer.output.said));
		});
	}, [chatId, isBusy, ask, quickAsk]);

	useEffect(() => {
		if (draft !== "") {
			suggest(null);
		}
	}, [draft]);

	useEffect(() => {
		showHint(suggestion === null ? null : `${suggestion}${HINT_GAP}${TAKES_IT}`);
		return () => showHint(null);
	}, [suggestion, showHint]);

	useTakesOnTab(input, suggestion, suggest);
}
