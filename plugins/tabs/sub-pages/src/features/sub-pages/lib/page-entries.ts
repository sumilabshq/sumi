import type { SidebarGroupItem, SidebarTab, TabsSidebar } from "@widgetarium/app-host/contract";

export type ChatEntry = SidebarTab & { readonly artifacts: NonNullable<SidebarTab["artifacts"]> };

export interface ChatHolding {
	readonly chat: ChatEntry;
	readonly list: string;
}

export function chatEntryOf(sidebar: TabsSidebar, tabId: string): ChatEntry | null {
	return chatEntriesOf(sidebar).find((chat) => chat.tab.id === tabId) ?? null;
}

export function chatEntriesOf(sidebar: TabsSidebar): readonly ChatEntry[] {
	return sidebar.sections
		.flatMap(({ entries }) =>
			entries.flatMap((entry) =>
				entry.kind === "split" ? entry.split.members.map(({ item }) => item) : itemsUnder(entry),
			),
		)
		.filter(isChatEntry);
}

export function holdingChatOf(sidebar: TabsSidebar, tabId: string): ChatHolding | null {
	for (const section of sidebar.sections) {
		const chat = chatEntriesOf({ ...sidebar, sections: [section] }).find(({ artifacts }) =>
			artifacts.some(({ tab }) => tab.id === tabId),
		);

		if (chat !== undefined) {
			return {
				chat,
				list: section.list,
			};
		}
	}

	return null;
}

function itemsUnder(item: SidebarGroupItem): readonly SidebarTab[] {
	return item.kind === "tab" ? [item] : item.group.items.flatMap(itemsUnder);
}

function isChatEntry(tab: SidebarTab): tab is ChatEntry {
	return tab.artifacts !== undefined;
}
