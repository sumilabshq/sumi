import { z } from "zod";
import { PerCall, Repeatable, command, refuse } from "@widgetarium/core/requests";
import type { Send } from "@widgetarium/core/requests";
import {
	CloseTabCommand,
	HeldTabsQuery,
	OpenTabCommand,
	RenameTabCommand,
	ReopenClosedTabByIdCommand,
	ReopenClosedTabCommand,
	ShowEssentialCommand,
	ShowTabCommand,
} from "@widgetarium/app-host";
import type { HeldTabs } from "@widgetarium/app-host";
import { OpenAddressCommand } from "@widgetarium/browser";
import {
	ActiveChatQuery,
	CreateChatCommand,
	CreateWorkspaceCommand,
	OpenChatElsewhereCommand,
	OpenWorkspaceCommand,
	PinChatCommand,
	RenameChatCommand,
	RenameWorkspaceCommand,
	SelectChatCommand,
	WorkspacesQuery,
} from "@widgetarium/workspaces";
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
		await performIntent(intent, send, commandMenu.menu());
		const after = menuAfter(intent, commandMenu.menu());

		if (after.next !== null) {
			commandMenu.saveMenu(after.next, after.reason);
		}

		const said = confirmationOf(intent);
		console.info(`[widgetarium] command menu did ${intent.do}: ${said}`);
		return {
			said,
			isMenuKept: after.isMenuKept,
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
				await send(RenameChatCommand, { id, title: trimmed });
				break;
			case "workspace":
				await send(RenameWorkspaceCommand, { id, name: trimmed });
				break;
		}

		console.info(`[widgetarium] command menu renamed ${kind} ${id} → ${trimmed}`);
		return {
			said: `Renamed. Search finds “${trimmed}” from now on`,
			isMenuKept: true,
		};
	});

async function performIntent(intent: Intent, send: Send, { pageId }: KeptMenu): Promise<void> {
	switch (intent.do) {
		case "show-tab":
			return send(ShowTabCommand, { id: intent.id });
		case "reopen-closed":
			return send(ReopenClosedTabByIdCommand, { tabId: intent.tabId });
		case "show-essential":
			return send(ShowEssentialCommand, { id: intent.id });
		case "open-chat":
			return send(SelectChatCommand, { id: intent.id });
		case "open-chat-elsewhere":
			return send(OpenChatElsewhereCommand, { workspaceId: intent.workspaceId, chatId: intent.chatId });
		case "open-workspace":
			return send(OpenWorkspaceCommand, { id: intent.id });
		case "open-app":
			await send(OpenTabCommand, { app: intent.app });
			return;
		case "open-address":
			return openAddress(intent, send, pageId);
		case "run":
			return runMenuCommand(intent.command, send);
		case "ask-ink":
			return createChat(intent.text, send);
		case "new-chat":
			return createChat(intent.title, send);
		case "new-workspace":
			return createWorkspace(intent.name, send);
		case "close-tab":
			return send(CloseTabCommand, { id: intent.id });
		case "pin-chat":
			return send(PinChatCommand, { id: intent.id, isPinned: intent.isPinned });
		default:
			return unknownIntent(intent);
	}
}

async function openAddress(
	{ address, where }: Extract<Intent, { do: "open-address" }>,
	send: Send,
	pageId: string | null,
): Promise<void> {
	const shown = pageId ?? shownPageOf(await send(HeldTabsQuery));

	if (where === "this-tab" && shown !== null) {
		return send(OpenAddressCommand, { tabId: shown, address, heldTabId: null });
	}

	await send(OpenTabCommand, { app: "browser" });
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
			return send(CreateChatCommand);
		case "reopen-tab":
			return send(ReopenClosedTabCommand);
		case "new-workspace":
			return send(CreateWorkspaceCommand);
		case "new-tab":
			return;
	}
}

async function createChat(title: string, send: Send): Promise<void> {
	const trimmed = title.trim();
	await send(CreateChatCommand);

	if (trimmed === "") {
		return;
	}

	await send(RenameChatCommand, { id: (await send(ActiveChatQuery)).id, title: trimmed });
}

async function createWorkspace(name: string, send: Send): Promise<void> {
	const trimmed = name.trim();
	await send(CreateWorkspaceCommand);

	if (trimmed === "") {
		return;
	}

	await send(RenameWorkspaceCommand, { id: (await send(WorkspacesQuery)).current.id, name: trimmed });
}

function unknownIntent(intent: never): never {
	throw new Error(`the command menu has no way to do ${JSON.stringify(intent)}`);
}
