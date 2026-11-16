import type { ChatElsewhereRow, ChatRecords } from "@widgetarium/workspaces/contract";
import type { SessionPage, SessionPageAsk, SessionRow } from "../../../shared/schema/sessions.schema.js";

export function sessionPageOf(
	here: ChatRecords,
	elsewhere: readonly ChatElsewhereRow[],
	{ text, limit, isArchived }: SessionPageAsk,
): SessionPage {
	if (!here.isRead) {
		return { isRead: false, rows: [], hasMore: false, archivedCount: 0 };
	}

	const needle = text.trim().toLowerCase();
	const hereShown = here.chats.filter((chat) => chat.isArchived === isArchived).map(hereRowOf);
	const elsewhereShown = isArchived ? [] : elsewhere.map(elsewhereRowOf);
	const found = [...hereShown, ...elsewhereShown]
		.filter(({ title, workspaceName }) => `${title} ${workspaceName ?? ""}`.toLowerCase().includes(needle))
		.sort((one, other) => other.lastAt - one.lastAt);
	return {
		isRead: true,
		rows: found.slice(0, limit),
		hasMore: found.length > limit,
		archivedCount: here.chats.filter((chat) => chat.isArchived).length,
	};
}

function hereRowOf({ id, title, lastAt }: ChatRecords["chats"][number]): SessionRow {
	return {
		chatId: id,
		title,
		lastAt,
		workspaceId: null,
		workspaceName: null,
	};
}

function elsewhereRowOf({ chatId, title, lastAt, workspaceId, workspaceName }: ChatElsewhereRow): SessionRow {
	return {
		chatId,
		title,
		lastAt,
		workspaceId,
		workspaceName,
	};
}
