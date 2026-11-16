import { Repeatable } from "@widgetarium/data-framework";
import type { Send } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { command } from "#module";
import {
	SessionArchivingSchema,
	SessionToDeleteSchema,
	SessionToOpenSchema,
} from "../../shared/schema/sessions.schema.js";

export const open = command()
	.public()
	.input(SessionToOpenSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ chatId, workspaceId }, { send }) => {
		if (workspaceId === null) {
			await send(appHost.tabs.showTab, { id: chatId });
			return;
		}

		await send(workspaces.workspaces.openChatElsewhere, { workspaceId, chatId });
	});

export const archive = command()
	.public()
	.input(SessionArchivingSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ chatId, isArchived }, { send }) => {
		await send(workspaces.chats.archiveChat, { id: chatId, isArchived });

		if (isArchived) {
			await closeTabOf(send, chatId, "archived");
		}
	});

export const remove = command()
	.public()
	.input(SessionToDeleteSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ chatId }, { send }) => {
		await send(workspaces.chats.deleteChat, { id: chatId });
		await closeTabOf(send, chatId, "deleted");
	});

async function closeTabOf(send: Send, chatId: string, why: string): Promise<void> {
	try {
		await send(appHost.tabActions.closeTab, { id: chatId });
	} catch (failure: unknown) {
		console.info(`[widgetarium] sessions close tab of ${why} chat ${chatId} skipped: ${String(failure)}`);
	}
}
