import { AdoptDraftCommand, PrefillDraftCommand, TakeDraftCommand } from "@widgetarium/assistant";
import type { AdoptedDraft } from "@widgetarium/assistant";
import { OpenNewChatCommand } from "@widgetarium/app-host";
import { toastRefusal } from "@widgetarium/data-framework/command-refusals";
import type { StartedApp } from "@widgetarium/data-framework";
import type { AskComposer } from "@sumi/sumi-host-plugin";
import { AskComposerBar } from "./features/assistant/ui/ask-composer-bar/ask-composer-bar.js";

export interface AskComposerApps {
	readonly windowApp: StartedApp;
	readonly focusedChatId: () => string | null;
	readonly askApp: StartedApp;
	readonly chatAppFor: (chatId: string) => StartedApp;
}

interface AskedDraft {
	readonly text: string;
	readonly sends: boolean;
	readonly chatId: string | null;
}

export function askComposerOf(apps: AskComposerApps): AskComposer {
	return {
		app: apps.askApp,
		bar: AskComposerBar,
		ask: (text, sends, chatId) => {
			if (chatId === null && text.trim() === "") {
				return;
			}

			void handDraftToChat(apps, { text, sends, chatId });
		},
	};
}

async function handDraftToChat(apps: AskComposerApps, asked: AskedDraft): Promise<void> {
	const chatId = asked.chatId ?? apps.focusedChatId() ?? (await newChatIdIn(apps.windowApp));

	if (chatId === null) {
		return;
	}

	const taken = await apps.askApp.send(TakeDraftCommand);

	if (!taken.ok) {
		console.error(`[widgetarium] Ask Sumi could not take the attachments of its composer: ${taken.reason}`);
		return;
	}

	await adoptIn(apps.chatAppFor(chatId), {
		chatId,
		said: asked.text,
		attachments: taken.output.attachments,
		sends: asked.sends,
	});
}

async function adoptIn(chatApp: StartedApp, draft: AdoptedDraft): Promise<void> {
	const adopted = await chatApp.send(AdoptDraftCommand, draft);

	if (!adopted.ok) {
		console.error(`[widgetarium] Ask Sumi could not hand its draft to chat ${draft.chatId}: ${adopted.reason}`);
		toastRefusal({ name: AdoptDraftCommand.name, reason: adopted.reason, ran: adopted.ran });
		return;
	}

	if (adopted.output.said === "") {
		return;
	}

	const filled = await chatApp.send(PrefillDraftCommand, { text: adopted.output.said });

	if (!filled.ok) {
		console.error(`[widgetarium] Ask Sumi could not fill the composer of chat ${draft.chatId}: ${filled.reason}`);
	}
}

async function newChatIdIn(windowApp: StartedApp): Promise<string | null> {
	const opened = await windowApp.send(OpenNewChatCommand, { title: null });

	if (!opened.ok) {
		console.error(`[widgetarium] Ask Sumi found no chat on this board and could not open one: ${opened.reason}`);
		return null;
	}

	return opened.output.id;
}
