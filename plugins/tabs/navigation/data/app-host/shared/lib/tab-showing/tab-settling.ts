import type { Send } from "@widgetarium/data-framework";
import { browser } from "@widgetarium/browser/contract";
import { navigation } from "@widgetarium/navigation/contract";
import type { TabEffect, TabsAsk, TabsSettled } from "@widgetarium/navigation/contract";
import { screenOf } from "./screen-of.js";
import { seatOf } from "../window-seat.js";
import type { SeatedWindow, WindowSeat } from "../window-seat.js";

const ALL_PAGES = { heldTabId: null };

const PAGE_EFFECTS = ["open-page", "close-page", "show-page", "open-address", "reload-page"] as const;
const WINDOW_EFFECTS = [
	"open-own-window",
	"focus-window",
	"focus-own-window",
	"tear-off-page",
	"tear-off-tab",
] as const;
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

interface PaneFlasher {
	flashPane(paneId: string): void;
}

export interface TabStores {
	readonly studioWindow: SeatedWindow;
	readonly paneFlash: PaneFlasher;
}

export interface TabsReach {
	readonly injects: TabStores;
	readonly send: Send;
	readonly told: () => void;
}

export async function tabsAskOf({ injects, send }: Pick<TabsReach, "injects" | "send">): Promise<TabsAsk> {
	const [browserTabs, asks, board] = await Promise.all([
		send(browser.tabs.all, ALL_PAGES),
		send(browser.asks.pending),
		send(navigation.panes.board, { seat: seatOf(injects.studioWindow) }),
	]);
	return {
		window: injects.studioWindow.placesWindow(),
		screen: screenOf({ browserTabs, asks, board }),
	};
}

export async function settleAsked<S extends TabsSettled>(
	reach: TabsReach,
	ask: (at: TabsAsk) => Promise<S>,
): Promise<S> {
	const settled = await ask(await tabsAskOf(reach));

	for (const effect of settled.effects) {
		await sendLogged(effect.kind, () => sendEffect(effect, reach));
	}

	reach.told();
	return settled;
}

export async function sendLogged(what: string, sending: () => Promise<unknown> | void): Promise<void> {
	try {
		await sending();
	} catch (failure: unknown) {
		console.error(`[widgetarium] the host tabs could not ${what}`, failure);
	}
}

async function sendEffect(effect: TabEffect, reach: TabsReach): Promise<unknown> {
	if (isPageEffect(effect)) {
		return sendPageEffect(effect, reach.send);
	}

	if (isWindowEffect(effect)) {
		return sendWindowEffect(effect, reach.send);
	}

	return isPaneEffect(effect) ? sendPaneEffect(effect, reach) : sendViewEffect(effect, reach);
}

async function sendPageEffect(effect: PageEffect, send: Send): Promise<unknown> {
	switch (effect.kind) {
		case "open-page":
			return send(browser.tabs.openPage, { tabId: effect.pageId });
		case "close-page":
			return send(browser.tabs.closePage, { tabId: effect.pageId });
		case "show-page":
			await send(browser.tabs.openPage, { tabId: effect.pageId });
			return send(browser.tabs.show, { tabId: effect.pageId });
		case "open-address":
			return send(browser.tabs.openAddress, addressAskOf(effect));
		case "reload-page":
			return send(browser.tabs.reloadPage, { tabId: effect.pageId });
	}
}

function sendWindowEffect(effect: WindowEffect, send: Send): Promise<unknown> {
	switch (effect.kind) {
		case "open-own-window":
			return send(browser.tabs.openInOwnWindow, { tabId: effect.pageId });
		case "focus-window":
			return send(browser.tabs.focusStudioWindow, { window: effect.window });
		case "focus-own-window":
			return send(browser.tabs.focusOwnWindow, { tabId: effect.pageId });
		case "tear-off-page":
			return send(browser.tabs.tearOff, { tabId: effect.pageId, openWith: effect.tabId });
		case "tear-off-tab":
			return send(browser.tabs.openWindow, { tabId: effect.tabId, view: effect.view });
	}
}

async function sendPaneEffect(effect: PaneEffect, { injects, send }: TabsReach): Promise<unknown> {
	const seat = seatOf(injects.studioWindow);
	switch (effect.kind) {
		case "close-panes":
			return send(navigation.panes.closeShowingPanes, { seat, tabIds: effect.tabIds });
		case "close-chat-panes":
			return closeChatPanes(send, { seat, chatIds: effect.chatIds });
		case "open-shown-tab-pane":
			return send(navigation.panes.openShown, { seat });
		case "close-shown-tab-pane":
			return send(navigation.panes.closeShown, { seat });
		case "show-in-target-pane":
			return send(navigation.panes.showInTarget, { seat, tabId: effect.tabId });
		case "flash-pane":
			await send(navigation.panes.aim, { seat, id: effect.paneId });
			return injects.paneFlash.flashPane(effect.paneId);
	}
}

async function sendViewEffect(effect: ViewEffect, { injects, send }: TabsReach): Promise<unknown> {
	if (effect.kind === "show-beside-chat") {
		return showBesideChat(send, seatOf(injects.studioWindow), effect);
	}

	if (effect.kind === "show-chat-beside-chat") {
		return showChatBesideChat(send, seatOf(injects.studioWindow), effect);
	}

	if (effect.kind === "show-chat") {
		return send(navigation.panes.showChat, {
			seat: seatOf(injects.studioWindow),
			chatId: effect.chatId,
			paneId: effect.paneId,
		});
	}

	console.info(`[widgetarium] ${effect.kind} skipped: navigation draws the shown split on read`);
	return undefined;
}

interface ChatPanes {
	readonly seat: WindowSeat;
	readonly chatIds: readonly string[];
}

async function closeChatPanes(send: Send, { seat, chatIds }: ChatPanes): Promise<void> {
	const board = await send(navigation.panes.board, { seat });
	const standing = board.leaves.filter((leaf) => leaf.view.kind === "chat" && chatIds.includes(leaf.view.chatId ?? ""));

	for (const leaf of standing) {
		await send(navigation.panes.close, { seat, id: leaf.id });
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

function isPageEffect(effect: TabEffect): effect is PageEffect {
	return PAGE_EFFECTS.some((kind) => kind === effect.kind);
}

function isWindowEffect(effect: TabEffect): effect is WindowEffect {
	return WINDOW_EFFECTS.some((kind) => kind === effect.kind);
}

function isPaneEffect(effect: TabEffect): effect is PaneEffect {
	return PANE_EFFECTS.some((kind) => kind === effect.kind);
}

async function showBesideChat(
	send: Send,
	seat: WindowSeat,
	{ chatId, tabId, side }: Extract<TabEffect, { readonly kind: "show-beside-chat" }>,
): Promise<unknown> {
	await send(navigation.panes.showChat, { seat, chatId, paneId: null });
	const board = await send(navigation.panes.board, { seat });

	if (board.tabPanes.some((pane) => pane.tabId === tabId)) {
		console.info(`[widgetarium] show ${tabId} beside chat ${chatId} skipped: a pane shows it already`);
		return undefined;
	}

	const chat = board.leaves.find((leaf) => leaf.view.kind === "chat" && leaf.view.chatId === chatId);

	if (chat === undefined) {
		console.warn(`[widgetarium] show ${tabId} beside chat ${chatId} skipped: the chat has no pane after showing it`);
		return undefined;
	}

	return send(navigation.panes.place, {
		seat,
		placement: { view: { kind: "app", tabId }, targetId: chat.id, side, home: chatId },
	});
}

async function showChatBesideChat(
	send: Send,
	seat: WindowSeat,
	{ chatId, besideChatId }: Extract<TabEffect, { readonly kind: "show-chat-beside-chat" }>,
): Promise<unknown> {
	await send(navigation.panes.showChat, { seat, chatId, paneId: null });
	const board = await send(navigation.panes.board, { seat });

	if (board.leaves.some((leaf) => leaf.view.kind === "chat" && leaf.view.chatId === besideChatId)) {
		console.info(`[widgetarium] show chat ${besideChatId} beside chat ${chatId}: it stands there already`);
		return send(navigation.panes.showChat, { seat, chatId: besideChatId, paneId: null });
	}

	const group = board.chatGroups.find((one) => one.chatId === chatId);

	if (group === undefined) {
		console.warn(`[widgetarium] show chat ${besideChatId} beside chat ${chatId} skipped: the chat has no group after showing it`);
		return undefined;
	}

	return send(navigation.panes.place, {
		seat,
		placement: { view: { kind: "chat", chatId: besideChatId }, targetId: group.groupId, side: "right", home: null },
	});
}
