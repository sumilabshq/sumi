import { useEffect } from "react";
import { OpenChatDraftCommand, PrefillDraftCommand } from "@sumi/contract";
import type { StartedApp } from "@widgetarium/core/requests";

export function useOpensChatDraft(shell: StartedApp, chatId: string): void {
	useEffect(() => {
		void openChatDraft(shell, chatId);
	}, [shell, chatId]);
}

async function openChatDraft(shell: StartedApp, chatId: string): Promise<void> {
	const opened = await shell.send(OpenChatDraftCommand, {
		chatId,
	});

	if (!opened.ok) {
		console.error(`[sumi-chat] the draft of chat ${chatId} was not opened: ${opened.reason}`);
		return;
	}

	if (opened.output.said === "") {
		return;
	}

	const filled = await shell.send(PrefillDraftCommand, {
		text: opened.output.said,
	});

	if (!filled.ok) {
		console.error(`[sumi-chat] the draft of chat ${chatId} was not put back: ${filled.reason}`);
	}
}
