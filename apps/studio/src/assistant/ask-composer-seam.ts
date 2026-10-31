import { AdoptDraftCommand, PrefillDraftCommand, TakeDraftCommand } from "@widgetarium/assistant";
import type { AdoptedDraft } from "@widgetarium/assistant";
import { OpenNewChatCommand } from "@widgetarium/app-host";
import { toastRefusal } from "@widgetarium/core/command-refusals.js";
import type { StartedApp } from "@widgetarium/core/requests";
import { focusedChatPortOf } from "../chats-column/focused-chat.js";
import type { AskComposer } from "../features/command-menu/lib/ask-composer-context.js";

export interface AskComposerApps {
	readonly studioApp: StartedApp;
	readonly askApp: StartedApp;
	readonly chatAppFor: (chatId: string) => StartedApp;
}

interface AskedDraft {
	readonly text: string;
	readonly sends: boolean;
}

export function askComposerOf(apps: AskComposerApps): AskComposer {
	return {
		app: apps.askApp,
		ask: (text, sends) => {
			if (text.trim() === "") {
				return;
			}

			void handDraftToChat(apps, { text, sends });
		},
	};
}

async function handDraftToChat(apps: AskComposerApps, asked: AskedDraft): Promise<void> {
	const chatId = focusedChatPortOf(apps.studioApp).now()?.id ?? (await newChatIdIn(apps.studioApp));

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

async function newChatIdIn(studioApp: StartedApp): Promise<string | null> {
	const opened = await studioApp.send(OpenNewChatCommand, { title: null });

	if (!opened.ok) {
		console.error(`[widgetarium] Ask Sumi found no chat on this board and could not open one: ${opened.reason}`);
		return null;
	}

	return opened.output.id;
}
