import type { ChatTabs } from "@widgetarium/places";
import type { ChatRecord, ChatRecords } from "@widgetarium/workspaces";
import type { ChatListData, ChatRowData } from "../../../shared/schema/chat-list.schema.js";

interface ChatTabRow {
	readonly id: string;
	readonly label: string | null;
}

export function chatListOf(tabs: ChatTabs, records: ChatRecords): ChatListData {
	const recordOf = new Map(records.chats.map((record) => [record.id, record]));
	const rowsOf = (rows: readonly ChatTabRow[], isPinned: boolean): ChatRowData[] =>
		rows.flatMap((row) => {
			const record = recordOf.get(row.id);
			return record === undefined ? [] : [rowOf(record, row.label, isPinned)];
		});
	return {
		pinned: rowsOf(tabs.pinned, true),
		recents: [...rowsOf(tabs.open, false), ...untabbedRowsOf(tabs, records)],
	};
}

function untabbedRowsOf(tabs: ChatTabs, records: ChatRecords): ChatRowData[] {
	const tabbed = new Set([...tabs.pinned, ...tabs.open].map((row) => row.id));
	return records.chats
		.filter((record) => !tabbed.has(record.id))
		.sort((one, other) => other.lastAt - one.lastAt)
		.map((record) => rowOf(record, null, false));
}

function rowOf(record: ChatRecord, label: string | null, isPinned: boolean): ChatRowData {
	return {
		id: record.id,
		title: label ?? record.title,
		isPinned,
		mark: record.mark,
	};
}
