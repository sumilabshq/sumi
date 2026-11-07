import { ShowChatInPaneCommand } from "@widgetarium/layout";
import {
	MarkTabSeenCommand,
	OpenTabCommand as PlacesOpenTabCommand,
	ShowTabCommand as PlacesShowTabCommand,
} from "@widgetarium/places";
import type { TabToOpen } from "../../schema/app-tab.schema.js";
import type { ChatToShow } from "../../schema/chat-opening.schema.js";
import { settleAsked } from "./tab-settling.js";
import type { TabsReach } from "./tab-settling.js";

export interface OpenedTab {
	readonly id: string;
}

export async function openTabSettled(reach: TabsReach, asked: TabToOpen): Promise<OpenedTab> {
	const opened = await settleAsked(reach, (at) => reach.send(PlacesOpenTabCommand, { at, ...asked }));
	return { id: opened.id };
}

export async function showTabSettled(reach: TabsReach, id: string): Promise<void> {
	await settleAsked(reach, (at) => reach.send(PlacesShowTabCommand, { at, id }));
}

export async function showChatSettled(reach: TabsReach, { chatId, paneId }: ChatToShow): Promise<void> {
	const window = await windowShowingTab(reach, chatId);

	if (window !== null) {
		console.info(`[widgetarium] open chat ${chatId} → window ${window} comes forward (places: it stands there)`);
		return;
	}

	await reach.send(MarkTabSeenCommand, { id: chatId });
	await reach.send(ShowChatInPaneCommand, { chatId, paneId });
}

async function windowShowingTab(reach: TabsReach, id: string): Promise<string | null> {
	try {
		const settled = await settleAsked(reach, (at) => reach.send(PlacesShowTabCommand, { at, id }));
		return settled.effects.flatMap((effect) => (effect.kind === "focus-window" ? [effect.window] : []))[0] ?? null;
	} catch (failure: unknown) {
		console.error(`[widgetarium] the host tabs could not show chat ${id} in the view`, failure);
		return null;
	}
}
