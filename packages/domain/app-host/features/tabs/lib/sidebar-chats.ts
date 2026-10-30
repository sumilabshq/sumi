import type { PlacedSidebar } from "@widgetarium/places";
import type { ChatRecord, ChatRecords } from "@widgetarium/workspaces";
import type { GroupItem, SidebarEntry, TabsSidebar } from "../../../shared/schema/app-tab.schema.js";

type PlacedEntry = PlacedSidebar["sections"][number]["entries"][number];

type PlacedItem = Exclude<PlacedEntry, { readonly kind: "group" | "split" }>;

type PlacedChat = Extract<PlacedItem, { readonly kind: "chat" }>["chat"];

export function sidebarWithChats(placed: PlacedSidebar, records: ChatRecords): TabsSidebar {
	const chats = new RecordedChats(records);
	return {
		...placed,
		sections: placed.sections.map((section) => ({
			list: section.list,
			title: section.title,
			entries: section.entries.flatMap((entry) => chats.entriesOf(entry)),
		})),
	};
}

class RecordedChats {
	private readonly recordOf: ReadonlyMap<string, ChatRecord>;

	constructor(records: ChatRecords) {
		this.recordOf = new Map(records.chats.map((record) => [record.id, record]));
	}

	entriesOf(entry: PlacedEntry): readonly SidebarEntry[] {
		if (entry.kind === "split") {
			const members = entry.split.members.flatMap(({ item, ...member }) =>
				this.itemsOf(item).map((recorded) => ({ ...member, item: recorded })),
			);
			return [{ kind: "split", split: { ...entry.split, members } }];
		}

		if (entry.kind !== "group") {
			return this.itemsOf(entry);
		}

		const items = entry.group.items.flatMap((item) => this.itemsOf(item));
		return [{ kind: "group", group: { ...entry.group, items } }];
	}

	private itemsOf(item: PlacedItem): readonly GroupItem[] {
		if (item.kind === "tab") {
			return [item];
		}

		const record = this.recordOf.get(item.chat.id);
		return record === undefined ? [] : [{ kind: "chat", chat: chatOf(item.chat, record), splitMark: item.splitMark }];
	}
}

function chatOf(chat: PlacedChat, record: ChatRecord): Extract<GroupItem, { readonly kind: "chat" }>["chat"] {
	return {
		...chat,
		title: chat.label ?? record.title,
		mark: record.mark,
	};
}
