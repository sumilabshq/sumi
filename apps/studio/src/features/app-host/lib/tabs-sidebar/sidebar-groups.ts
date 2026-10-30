import type { GroupHue, SidebarEntry, SidebarTab, TabChild, TabsSidebar } from "@widgetarium/app-host";

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

	return holdersOf(sidebar)
		.filter((holder) => holder.tab.id === list)
		.flatMap(({ children = [] }) =>
			children.flatMap((child) => (child.kind === "group" ? [nestedGroupFaceOf(child)] : [])),
		);
}

export function groupFaceOf(sidebar: TabsSidebar, id: string | null): GroupFace | null {
	const lists = [...sidebar.sections.map((section) => section.list), ...holdersOf(sidebar).map(({ tab }) => tab.id)];
	return lists.flatMap((list) => groupsOfList(sidebar, list)).find((group) => group.id === id) ?? null;
}

export function holdersOf(sidebar: TabsSidebar): readonly SidebarTab[] {
	const items = sidebar.sections.flatMap((section) => section.entries.flatMap(itemsOfEntry));
	return items.filter((item) => item.children !== undefined);
}

export function itemsOfEntry(entry: SidebarEntry): readonly SidebarTab[] {
	if (entry.kind === "group") {
		return entry.group.items;
	}

	return entry.kind === "split" ? entry.split.members.map((member) => member.item) : [entry];
}

function topGroupFaceOf({ group }: Extract<SidebarEntry, { readonly kind: "group" }>): GroupFace {
	return {
		id: group.id,
		name: group.name,
		hue: group.hue,
		count: group.items.length,
	};
}

function nestedGroupFaceOf({ group }: Extract<TabChild, { readonly kind: "group" }>): GroupFace {
	return {
		id: group.id,
		name: group.name,
		hue: group.hue,
		count: group.tabs.length,
	};
}
