import { AppTabQuery } from "@sumi/contract";
import type { TabModules, TabPageProps, WindowOffers } from "@sumi/sumi-host-plugin";
import { AssistantModule } from "@widgetarium/assistant/module";
import { MascotModule } from "@widgetarium/mascot/module";
import { TasksModule } from "@widgetarium/tasks";
import { hostForChat } from "../../../shared/lib/chat-apps.js";

const NO_CHAT = "[sumi-chat] tab {tab}: no chat → no assistant in its page ({reason})";

export async function chatModulesOf({ tabId }: TabPageProps, offers: WindowOffers): Promise<TabModules> {
	const chatId = await chatIdOf(offers, tabId);
	const imports = [TasksModule.over(offers.core)];

	if (chatId === null) {
		return {
			modules: [MascotModule],
			imports,
		};
	}

	return {
		modules: [MascotModule, AssistantModule(hostForChat(offers.assistant, chatId))],
		imports,
	};
}

async function chatIdOf({ windowApp }: WindowOffers, tabId: string): Promise<string | null> {
	const answer = await windowApp.send(AppTabQuery, {
		id: tabId,
	});

	if (!answer.ok) {
		console.info(NO_CHAT.replace("{tab}", tabId).replace("{reason}", answer.reason));
		return null;
	}

	return answer.output.chatId;
}
