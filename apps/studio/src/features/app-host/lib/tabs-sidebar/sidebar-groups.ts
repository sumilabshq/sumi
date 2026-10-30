import type { ChatState, GroupHue, SidebarEntry, TabsSidebar } from "@widgetarium/app-host";

export interface GroupFace {
	readonly id: string;
	readonly name: string;
	readonly hue: GroupHue | null;
	readonly count: number;
}

export function groupsOfList(sidebar: TabsSidebar, list: string): readonly GroupFace[] {
	const section = sidebar.sections.find((one) => one.list === list);

	if (section !== undefined) {
		return section.entries.flatMap((entry) => (entry.kind === "group" ? [topGroupFaceOf(entry)] : []));
	}

	return chatsOf(sidebar)
		.filter((chat) => chat.id === list)
		.flatMap((chat) => chat.children.flatMap((child) => (child.kind === "group" ? [nestedGroupFaceOf(child)] : [])));
}

export function groupFaceOf(sidebar: TabsSidebar, id: string | null): GroupFace | null {
	const lists = [...sidebar.sections.map((section) => section.list), ...chatsOf(sidebar).map((chat) => chat.id)];
	return lists.flatMap((list) => groupsOfList(sidebar, list)).find((group) => group.id === id) ?? null;
}

export function chatsOf(sidebar: TabsSidebar): readonly ChatState[] {
	const items = sidebar.sections.flatMap((section) =>
		section.entries.flatMap((entry) => (entry.kind === "group" ? entry.group.items : [entry])),
	);
	return items.flatMap((item) => (item.kind === "chat" ? [item.chat] : []));
}

function topGroupFaceOf({ group }: Extract<SidebarEntry, { readonly kind: "group" }>): GroupFace {
	return {
		id: group.id,
		name: group.name,
		hue: group.hue,
		count: group.items.length,
	};
}

function nestedGroupFaceOf({ group }: Extract<ChatState["children"][number], { readonly kind: "group" }>): GroupFace {
	return {
		id: group.id,
		name: group.name,
		hue: group.hue,
		count: group.tabs.length,
	};
}
