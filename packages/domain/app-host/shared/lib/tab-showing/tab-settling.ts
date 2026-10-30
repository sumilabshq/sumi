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
	LeaveSplitCommand,
	OpenShownTabPaneCommand,
	ClosePaneCommand,
	PaneTreeQuery,
	ShowChatInPaneCommand,
	ShowTabInChatGroupCommand,
	ShowSplitCommand,
	FocusSplitCommand,
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

const PAGE_EFFECTS = ["open-page", "close-page", "show-page", "open-address", "reload-page"] as const;
const WINDOW_EFFECTS = ["open-own-window", "focus-window", "focus-own-window", "tear-off-page"] as const;
const PANE_EFFECTS = [
	"close-panes",
	"close-chat-panes",
	"open-shown-tab-pane",
	"close-shown-tab-pane",
	"show-in-target-pane",
	"flash-pane",
] as const;

type PageEffect = Extract<TabEffect, { readonly kind: (typeof PAGE_EFFECTS)[number] }>;
type WindowEffect = Extract<TabEffect, { readonly kind: (typeof WINDOW_EFFECTS)[number] }>;
type PaneEffect = Extract<TabEffect, { readonly kind: (typeof PANE_EFFECTS)[number] }>;
type ViewEffect = Exclude<TabEffect, PageEffect | WindowEffect | PaneEffect>;

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

	await send(KeepChatTabsCommand, { chats: records.chats.map(({ id, title }) => ({ id, title })) });
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

async function sendEffect(effect: TabEffect, reach: TabsReach): Promise<unknown> {
	if (isPageEffect(effect)) {
		return sendPageEffect(effect, reach.send);
	}

	if (isWindowEffect(effect)) {
		return sendWindowEffect(effect, reach.send);
	}

	return isPaneEffect(effect) ? sendPaneEffect(effect, reach) : sendViewEffect(effect, reach.send);
}

async function sendPageEffect(effect: PageEffect, send: Send): Promise<unknown> {
	switch (effect.kind) {
		case "open-page":
			return send(OpenPageCommand, { tabId: effect.pageId });
		case "close-page":
			return send(ClosePageCommand, { tabId: effect.pageId });
		case "show-page":
			await send(OpenPageCommand, { tabId: effect.pageId });
			return send(ShowBrowserPageCommand, { tabId: effect.pageId });
		case "open-address":
			return send(OpenAddressCommand, addressAskOf(effect));
		case "reload-page":
			return send(ReloadPageCommand, { tabId: effect.pageId });
	}
}

function sendWindowEffect(effect: WindowEffect, send: Send): Promise<unknown> {
	switch (effect.kind) {
		case "open-own-window":
			return send(OpenTabInOwnWindowCommand, { tabId: effect.pageId });
		case "focus-window":
			return send(FocusStudioWindowCommand, { window: effect.window });
		case "focus-own-window":
			return send(FocusOwnWindowCommand, { tabId: effect.pageId });
		case "tear-off-page":
			return send(TearOffCommand, { tabId: effect.pageId, openWith: effect.tabId });
	}
}

async function sendPaneEffect(effect: PaneEffect, { parts, send }: TabsReach): Promise<unknown> {
	switch (effect.kind) {
		case "close-panes":
			return send(ClosePanesOfTabsCommand, { tabIds: effect.tabIds });
		case "close-chat-panes":
			return closeChatPanes(send, effect.chatIds);
		case "open-shown-tab-pane":
			return send(OpenShownTabPaneCommand);
		case "close-shown-tab-pane":
			return send(CloseShownTabPaneCommand);
		case "show-in-target-pane":
			return send(ShowTabInTargetPaneCommand, { tabId: effect.tabId });
		case "flash-pane":
			await send(AimPaneCommand, { id: effect.paneId });
			return parts.paneFlash.flashPane(effect.paneId);
	}
}

function sendViewEffect(effect: ViewEffect, send: Send): Promise<unknown> {
	switch (effect.kind) {
		case "show-chat":
			return send(ShowChatInPaneCommand, { chatId: effect.chatId, paneId: null });
		case "show-in-chat-group":
			return send(ShowTabInChatGroupCommand, chatGroupAskOf(effect));
		case "show-split":
			return send(ShowSplitCommand, { layout: effect.layout, chatIds: effect.chatIds, focusedId: effect.focusedId });
		case "focus-split":
			return send(FocusSplitCommand, { focusedId: effect.focusedId });
		case "leave-split":
			return send(LeaveSplitCommand);
	}
}

async function closeChatPanes(send: Send, chatIds: readonly string[]): Promise<void> {
	const board = await send(PaneTreeQuery);
	const standing = board.leaves.filter((leaf) => leaf.view.kind === "chat" && chatIds.includes(leaf.view.chatId ?? ""));

	for (const leaf of standing) {
		await send(ClosePaneCommand, { id: leaf.id });
	}
}

function addressAskOf({ pageId, address, isShown }: Extract<TabEffect, { readonly kind: "open-address" }>): {
	readonly tabId: string;
	readonly address: string;
	readonly heldTabId: string | null;
} {
	return {
		tabId: pageId,
		address,
		heldTabId: isShown ? null : pageId,
	};
}

function chatGroupAskOf({
	chatId,
	tabId,
	isOnlyWhenBare,
}: Extract<TabEffect, { readonly kind: "show-in-chat-group" }>): {
	readonly chatId: string;
	readonly tabId: string;
	readonly isOnlyWhenBare: boolean;
} {
	return {
		chatId,
		tabId,
		isOnlyWhenBare,
	};
}

function isPageEffect(effect: TabEffect): effect is PageEffect {
	return PAGE_EFFECTS.some((kind) => kind === effect.kind);
}

function isWindowEffect(effect: TabEffect): effect is WindowEffect {
	return WINDOW_EFFECTS.some((kind) => kind === effect.kind);
}

function isPaneEffect(effect: TabEffect): effect is PaneEffect {
	return PANE_EFFECTS.some((kind) => kind === effect.kind);
}
