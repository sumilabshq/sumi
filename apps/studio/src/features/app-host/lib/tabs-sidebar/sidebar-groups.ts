import type { GroupHue, SidebarEntry, SidebarTab, TabsSidebar } from "@widgetarium/app-host/contract";

export interface GroupFace {
	readonly id: string;
	readonly name: string;
	readonly hue: GroupHue | null;
	readonly count: number;
}

export function groupFaceOf(sidebar: TabsSidebar, id: string | null): GroupFace | null {
	const groups = sidebar.sections.flatMap((section) =>
		section.entries.flatMap((entry) => (entry.kind === "group" ? [groupFaceOfEntry(entry)] : [])),
	);
	return groups.find((group) => group.id === id) ?? null;
}

export function itemsOfEntry(entry: SidebarEntry): readonly SidebarTab[] {
	if (entry.kind === "group") {
		return entry.group.items;
	}

	return entry.kind === "split" ? entry.split.members.map((member) => member.item) : [entry];
}

function groupFaceOfEntry({ group }: Extract<SidebarEntry, { readonly kind: "group" }>): GroupFace {
	return {
		id: group.id,
		name: group.name,
		hue: group.hue,
		count: group.items.length,
	};
}
