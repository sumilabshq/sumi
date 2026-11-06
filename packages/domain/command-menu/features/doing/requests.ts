import { z } from "zod";
import { PerCall, Repeatable, command, refuse } from "@widgetarium/data-framework";
import type { Send } from "@widgetarium/data-framework";
import {
	CloseTabCommand,
	HeldTabsQuery,
	OpenChatCommand,
	OpenNewChatCommand,
	OpenTabCommand,
	PinTabCommand,
	RenameTabCommand,
	ReopenClosedTabByIdCommand,
	ShowEssentialCommand,
	ShowTabCommand,
} from "@widgetarium/app-host";
import type { HeldTabs } from "@widgetarium/app-host";
import { OpenAddressCommand } from "@widgetarium/browser";
import { OpenChatElsewhereCommand, OpenWorkspaceCommand, RenameWorkspaceCommand } from "@widgetarium/workspaces";
import { CommandMenuGateway } from "../../gateways/command-menu/command-menu.gateway.js";
import { DoneSchema, IntentSchema, RenameAskSchema } from "../../shared/schema/command-menu.schema.js";
import type { Done, Intent, KeptMenu, MenuCommand } from "../../shared/schema/command-menu.schema.js";
import { confirmationOf } from "./lib/confirmation.js";
import { menuAfter } from "./lib/menu-after.js";

const NO_NAME = "A new name cannot be empty.";

export const DoRowCommand = command("do-row")
	.input(z.object({ intent: IntentSchema }))
	.output(DoneSchema)
	.idempotencyKey(PerCall)
	.inject({ commandMenu: CommandMenuGateway })
	.handle(async ({ intent }, { commandMenu, send }): Promise<Done> => {
		const chatId = await performIntent(intent, send, commandMenu.menu());
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

export const RenameRowCommand = command("rename-row")
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
				await send(RenameTabCommand, { id, label: trimmed });
				break;
			case "chat":
				await send(RenameTabCommand, { id, label: trimmed });
				break;
			case "workspace":
				await send(RenameWorkspaceCommand, { id, name: trimmed });
				break;
		}

		console.info(`[widgetarium] command menu renamed ${kind} ${id} → ${trimmed}`);
		return {
			said: `Renamed. Search finds “${trimmed}” from now on`,
			isMenuKept: true,
			chatId: null,
		};
	});

async function performIntent(intent: Intent, send: Send, menu: KeptMenu): Promise<string | null> {
	if (intent.do === "ask-ink") {
		return newChatIdOf(intent.text, send);
	}

	await performOpening(intent, send, menu);
	return null;
}

async function performOpening(
	intent: Exclude<Intent, { do: "ask-ink" }>,
	send: Send,
	{ newTabList, pageId }: KeptMenu,
): Promise<void> {
	switch (intent.do) {
		case "show-tab":
			return send(ShowTabCommand, { id: intent.id });
		case "reopen-closed":
			return send(ReopenClosedTabByIdCommand, { tabId: intent.tabId });
		case "show-essential":
			return send(ShowEssentialCommand, { id: intent.id });
		case "open-chat":
			return send(OpenChatCommand, { chatId: intent.id, paneId: null });
		case "open-chat-elsewhere":
			return send(OpenChatElsewhereCommand, { workspaceId: intent.workspaceId, chatId: intent.chatId });
		case "open-workspace":
			return send(OpenWorkspaceCommand, { id: intent.id });
		case "open-app":
			await send(OpenTabCommand, { app: intent.app, list: newTabList });
			return;
		case "open-address":
			return openAddress(intent, send, { newTabList, pageId });
		case "run":
			return runMenuCommand(intent.command, send);
		case "close-tab":
			return send(CloseTabCommand, { id: intent.id });
		case "pin-chat":
			return send(PinTabCommand, { id: intent.id, isPinned: intent.isPinned });
		default:
			return unknownIntent(intent);
	}
}

async function openAddress(
	{ address, where }: Extract<Intent, { do: "open-address" }>,
	send: Send,
	{ newTabList, pageId }: Pick<KeptMenu, "newTabList" | "pageId">,
): Promise<void> {
	const shown = pageId ?? shownPageOf(await send(HeldTabsQuery));

	if (where === "this-tab" && shown !== null) {
		return send(OpenAddressCommand, { tabId: shown, address, heldTabId: null });
	}

	await send(OpenTabCommand, { app: "browser", list: newTabList });
	const opened = shownPageOf(await send(HeldTabsQuery));

	if (opened === null) {
		throw new Error(`the new tab for ${address} holds no browser page`);
	}

	await send(OpenAddressCommand, { tabId: opened, address, heldTabId: null });
}

function shownPageOf({ tabs, shownTabId }: HeldTabs): string | null {
	const shown = tabs.find((tab) => tab.id === shownTabId);
	return shown?.app === "browser" ? shown.pageId : null;
}

async function runMenuCommand(menuCommand: MenuCommand, send: Send): Promise<void> {
	switch (menuCommand) {
		case "new-chat":
			await send(OpenNewChatCommand, { title: null });
			return;
		case "new-tab":
			return;
	}
}

async function newChatIdOf(text: string, send: Send): Promise<string> {
	const opened = await send(OpenNewChatCommand, { title: text === "" ? null : text });
	return opened.id;
}

function unknownIntent(intent: never): never {
	throw new Error(`the command menu has no way to do ${JSON.stringify(intent)}`);
}
