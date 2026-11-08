import { layout } from "@widgetarium/layout";
import { places } from "@widgetarium/places";
import type { TabToOpen } from "../../schema/app-tab.schema.js";
import type { ChatToShow } from "../../schema/chat-opening.schema.js";
import { settleAsked } from "./tab-settling.js";
import type { TabsReach } from "./tab-settling.js";

export interface OpenedTab {
	readonly id: string;
}

export async function openTabSettled(reach: TabsReach, asked: TabToOpen): Promise<OpenedTab> {
	const opened = await settleAsked(reach, (at) => reach.send(places.tabOpening.openTab, { at, ...asked }));
	return { id: opened.id };
}

export async function showTabSettled(reach: TabsReach, id: string): Promise<void> {
	await settleAsked(reach, (at) => reach.send(places.tabShowing.showTab, { at, id }));
}

export async function showChatSettled(reach: TabsReach, { chatId, paneId }: ChatToShow): Promise<void> {
	const window = await windowShowingTab(reach, chatId);

	if (window !== null) {
		console.info(`[widgetarium] open chat ${chatId} → window ${window} comes forward (places: it stands there)`);
		return;
	}

	await reach.send(places.tabFacts.markTabSeen, { id: chatId });
	await reach.send(layout.paneTabs.showChatInPane, { chatId, paneId });
}

async function windowShowingTab(reach: TabsReach, id: string): Promise<string | null> {
	try {
		const settled = await settleAsked(reach, (at) => reach.send(places.tabShowing.showTab, { at, id }));
		return settled.effects.flatMap((effect) => (effect.kind === "focus-window" ? [effect.window] : []))[0] ?? null;
	} catch (failure: unknown) {
		console.error(`[widgetarium] the host tabs could not show chat ${id} in the view`, failure);
		return null;
	}
}
