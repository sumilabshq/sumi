import { layout } from "@widgetarium/layout/contract";
import { z } from "zod";
import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import type { Send } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import type { HeldTabs } from "@widgetarium/app-host/contract";
import { browser } from "@widgetarium/browser/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { DoneSchema, HomeIntentSchema, IntentSchema, RenameAskSchema } from "../../shared/schema/command-menu.schema.js";
import type { Done, HomePlace, Intent, KeptMenu, MenuCommand } from "../../shared/schema/command-menu.schema.js";
import { confirmationOf } from "./lib/confirmation.js";
import { homePlaceOf, openedInNewTab, whereOf } from "./lib/home-place.js";
import { menuAfter } from "./lib/menu-after.js";

type OpenedOver = Pick<KeptMenu, "newTabList" | "pageId">;

const NO_NAME = "A new name cannot be empty.";
const OVER_NO_PAGE: OpenedOver = {
	newTabList: null,
	pageId: null,
};

export const runIntent = command()
	.public()
	.input(z.object({ intent: IntentSchema }))
	.output(DoneSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ intent }, { commandMenu, send }): Promise<Done> => {
		const chatId = await performIntent(intent, send, commandMenu.menu());

		if (whereOf(intent) === "new-window") {
			await settlePlace("new-window", null, send);
		}

		const after = menuAfter(intent, commandMenu.menu());

		if (after.next !== null) {
			commandMenu.saveMenu(after.next, after.reason);
		}

		const said = confirmationOf(intent);
		console.info(`[widgetarium] command menu did ${intent.do}: ${said}`);
		return {
			said,
			isMenuKept: after.isMenuKept,
			chatId,
		};
	});

export const runHomeIntent = command()
	.public()
	.input(HomeIntentSchema)
	.output(DoneSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ intent, homeTabId, place }, { send }): Promise<Done> => {
		const placed = homePlaceOf(intent, place);
		const chatId = await performIntent(openedInNewTab(intent), send, OVER_NO_PAGE);
		await settlePlace(placed, homeTabId, send);
		const said = confirmationOf(intent);
		console.info(`[widgetarium] home ${homeTabId} did ${intent.do} (${placed}): ${said}`);
		return {
			said,
			isMenuKept: false,
			chatId,
		};
	});

export const renameRow = command()
	.public()
	.input(RenameAskSchema)
	.output(DoneSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ kind, id, name }, { send }): Promise<Done> => {
		const trimmed = name.trim();

		if (trimmed === "") {
			return refuse(NO_NAME);
		}

		switch (kind) {
			case "tab":
				await send(appHost.tabActions.renameTab, { id, label: trimmed });
				break;
			case "chat":
				await send(appHost.tabActions.renameTab, { id, label: trimmed });
				break;
			case "workspace":
				await send(workspaces.workspaces.rename, { id, name: trimmed });
				break;
		}

		console.info(`[widgetarium] command menu renamed ${kind} ${id} → ${trimmed}`);
		return {
			said: `Renamed. Search finds “${trimmed}” from now on`,
			isMenuKept: true,
			chatId: null,
		};
	});

async function performIntent(intent: Intent, send: Send, over: OpenedOver): Promise<string | null> {
	if (intent.do === "ask-ink") {
		return newChatIdOf(intent.text, send);
	}

	await performOpening(intent, send, over);
	return null;
}

async function settlePlace(place: HomePlace, homeTabId: string | null, send: Send): Promise<void> {
	if (place === "new-tab") {
		return;
	}

	const { shownTabId } = await send(appHost.tabs.heldTabs);

	if (shownTabId === null || shownTabId === homeTabId) {
		console.info(`[widgetarium] ${place} skipped: no tab was opened beside home ${homeTabId ?? "(none)"}`);
		return;
	}

	if (place === "new-window") {
		await send(appHost.tabActions.tearOff, { id: shownTabId });
		console.info(`[widgetarium] tab ${shownTabId} in this window → in its own window (opened in a new window)`);
		return;
	}

	if (homeTabId === null) {
		return;
	}

	await send(appHost.tabActions.closeTab, { id: homeTabId });
	console.info(`[widgetarium] home tab ${homeTabId} open → closed (${shownTabId} opened in its place)`);
}

async function performOpening(
	intent: Exclude<Intent, { do: "ask-ink" }>,
	send: Send,
	{ newTabList, pageId }: OpenedOver,
): Promise<void> {
	switch (intent.do) {
		case "show-tab":
		case "open-chat":
			return send(appHost.tabs.showTab, { id: intent.id });
		case "reopen-closed":
			return send(appHost.closedTabs.reopenById, { tabId: intent.tabId });
		case "show-essential":
			return send(appHost.essentials.showEssential, { id: intent.id });
		case "open-chat-elsewhere":
			return send(workspaces.workspaces.openChatElsewhere, { workspaceId: intent.workspaceId, chatId: intent.chatId });
		case "open-workspace":
			return send(workspaces.workspaces.open, { id: intent.id });
		case "open-app":
			await send(appHost.tabActions.openTab, { app: intent.app, list: newTabList });
			return;
		case "open-address":
			return openAddress(intent, send, { newTabList, pageId });
		case "open-link":
			await send(appHost.links.openLink, { href: intent.href, opensNew: intent.where !== "this-tab" });
			return;
		case "run":
			return runMenuCommand(intent.command, send);
		case "close-tab":
			return send(appHost.tabActions.closeTab, { id: intent.id });
		case "pin-chat":
			return send(appHost.tabActions.pin, { id: intent.id, isPinned: intent.isPinned });
		case "unsplit":
			return send(appHost.splits.unsplit, { tabIds: intent.tabIds });
		case "open-door":
			return;
		default:
			return unknownIntent(intent);
	}
}

async function openAddress(
	{ address, where }: Extract<Intent, { do: "open-address" }>,
	send: Send,
	{ newTabList, pageId }: OpenedOver,
): Promise<void> {
	const shown = pageId ?? shownPageOf(await send(appHost.tabs.heldTabs));

	if (where === "this-tab" && shown !== null) {
		return send(browser.tabs.openAddress, { tabId: shown, address, heldTabId: null });
	}

	await send(appHost.tabActions.openTab, { app: "browser", list: newTabList });
	const opened = shownPageOf(await send(appHost.tabs.heldTabs));

	if (opened === null) {
		throw new Error(`the new tab for ${address} holds no browser page`);
	}

	await send(browser.tabs.openAddress, { tabId: opened, address, heldTabId: null });
}

function shownPageOf({ tabs, shownTabId }: HeldTabs): string | null {
	const shown = tabs.find((tab) => tab.id === shownTabId);
	return shown?.app === "browser" ? shown.pageId : null;
}

async function runMenuCommand(menuCommand: MenuCommand, send: Send): Promise<void> {
	switch (menuCommand) {
		case "new-chat":
			await send(chatTabs.chatOpening.openNew, { title: null });
			return;
		case "new-tab":
			return;
		case "tabs-in-sidebar":
			await send(layout.frameSides.placeTabs, { tabs: "sidebar" });
			return;
		case "tabs-in-header":
			await send(layout.frameSides.placeTabs, { tabs: "header" });
			return;
	}
}

async function newChatIdOf(text: string, send: Send): Promise<string> {
	const opened = await send(chatTabs.chatOpening.openNew, { title: text === "" ? null : text });
	return opened.id;
}

function unknownIntent(intent: never): never {
	throw new Error(`the command menu has no way to do ${JSON.stringify(intent)}`);
}
