import type { Send } from "@widgetarium/core/requests";
import {
	AccessAsksQuery,
	BrowserTabsQuery,
	ClosePageCommand,
	FocusOwnWindowCommand,
	FocusStudioWindowCommand,
	OpenAddressCommand,
	OpenPageCommand,
	OpenTabInOwnWindowCommand,
	ReloadPageCommand,
	ShowTabCommand as ShowBrowserPageCommand,
	TearOffCommand,
} from "@widgetarium/browser";
import {
	AimPaneCommand,
	ClosePanesOfTabsCommand,
	CloseShownTabPaneCommand,
	OpenShownTabPaneCommand,
	PaneTreeQuery,
	ShowChatInPaneCommand,
	ShowTabInChatGroupCommand,
	ShowTabInTargetPaneCommand,
} from "@widgetarium/layout";
import { KeepChatTabsCommand } from "@widgetarium/places";
import type { TabEffect, TabsAsk, TabsSettled } from "@widgetarium/places";
import { ChatRecordsQuery } from "@widgetarium/workspaces";
import type { KeptEssentials } from "../../schema/essential.schema.js";
import type { StudioView } from "../../schema/studio-view.schema.js";
import type { MovedEssentials } from "../essentials/essentials.js";
import { screenOf } from "./screen-of.js";

const ALL_PAGES = { heldTabId: null };

interface StudioWindowSeat {
	windowLabel(): string;
}

interface ShownViewStore {
	shownView(): StudioView;
	saveShownView(view: StudioView, reason: string): void;
}

interface PaneFlasher {
	flashPane(paneId: string): void;
}

interface EssentialsStore {
	saveEssentials(essentials: KeptEssentials, reason: string): void;
}

export interface TabStores {
	readonly studioWindow: StudioWindowSeat;
	readonly shownView: ShownViewStore;
	readonly paneFlash: PaneFlasher;
}

export interface TabsReach {
	readonly parts: TabStores;
	readonly send: Send;
	readonly told: () => void;
}

export async function tabsAskOf({ parts, send }: Pick<TabsReach, "parts" | "send">): Promise<TabsAsk> {
	const [browserTabs, asks, board] = await Promise.all([
		send(BrowserTabsQuery, ALL_PAGES),
		send(AccessAsksQuery),
		send(PaneTreeQuery),
	]);
	return {
		window: parts.studioWindow.windowLabel(),
		view: parts.shownView.shownView(),
		screen: screenOf({ browserTabs, asks, board }),
	};
}

export async function settleAsked<S extends TabsSettled>(
	reach: TabsReach,
	ask: (at: TabsAsk) => Promise<S>,
): Promise<S> {
	const settled = await ask(await tabsAskOf(reach));
	saveView(reach.parts.shownView, settled.view);

	for (const effect of settled.effects) {
		await sendLogged(effect.kind, () => sendEffect(effect, reach));
	}

	reach.told();
	return settled;
}

export function saveEssentials(was: KeptEssentials, moved: MovedEssentials | null, essentials: EssentialsStore): void {
	if (moved === null) {
		return;
	}

	essentials.saveEssentials(moved.kept, moved.reason);
	console.info(`[widgetarium] essentials ${was.essentials.length} → ${moved.kept.essentials.length} (${moved.reason})`);
}

export async function keepChatTabs(send: Send): Promise<void> {
	const records = await send(ChatRecordsQuery);

	if (!records.isRead) {
		console.info("[widgetarium] keep chat tabs skipped: the chats are not read yet");
		return;
	}

	await send(KeepChatTabsCommand, { chatIds: records.chats.map(({ id }) => id) });
}

export async function sendLogged(what: string, sending: () => Promise<unknown> | void): Promise<void> {
	try {
		await sending();
	} catch (failure: unknown) {
		console.error(`[widgetarium] the host tabs could not ${what}`, failure);
	}
}

function saveView(shownView: ShownViewStore, next: StudioView): void {
	const was = shownView.shownView();

	if (was === next) {
		return;
	}

	const reason = `shown view ${was} → ${next} (tabs settled)`;
	shownView.saveShownView(next, reason);
	console.info(`[widgetarium] ${reason}`);
}

async function sendEffect(effect: TabEffect, { parts, send }: TabsReach): Promise<unknown> {
	switch (effect.kind) {
		case "open-page":
			return send(OpenPageCommand, { tabId: effect.pageId });
		case "close-page":
			return send(ClosePageCommand, { tabId: effect.pageId });
		case "show-page":
			await send(OpenPageCommand, { tabId: effect.pageId });
			return send(ShowBrowserPageCommand, { tabId: effect.pageId });
		case "open-address":
			return send(OpenAddressCommand, {
				tabId: effect.pageId,
				address: effect.address,
				heldTabId: effect.isShown ? null : effect.pageId,
			});
		case "reload-page":
			return send(ReloadPageCommand, { tabId: effect.pageId });
		case "open-own-window":
			return send(OpenTabInOwnWindowCommand, { tabId: effect.pageId });
		case "focus-window":
			return send(FocusStudioWindowCommand, { window: effect.window });
		case "focus-own-window":
			return send(FocusOwnWindowCommand, { tabId: effect.pageId });
		case "tear-off-page":
			return send(TearOffCommand, { tabId: effect.pageId, openWith: effect.tabId });
		case "close-panes":
			return send(ClosePanesOfTabsCommand, { tabIds: effect.tabIds });
		case "open-shown-tab-pane":
			return send(OpenShownTabPaneCommand);
		case "close-shown-tab-pane":
			return send(CloseShownTabPaneCommand);
		case "show-in-target-pane":
			return send(ShowTabInTargetPaneCommand, { tabId: effect.tabId });
		case "show-chat":
			return send(ShowChatInPaneCommand, { chatId: effect.chatId, paneId: null });
		case "show-in-chat-group":
			return send(ShowTabInChatGroupCommand, {
				chatId: effect.chatId,
				tabId: effect.tabId,
				isOnlyWhenBare: effect.isOnlyWhenBare,
			});
		case "flash-pane":
			await send(AimPaneCommand, { id: effect.paneId });
			return parts.paneFlash.flashPane(effect.paneId);
	}
}
