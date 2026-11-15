import type { SidebarEntry, TabsSidebar } from "@widgetarium/app-host/contract";

export function arrangementKeyOf(sidebar: TabsSidebar): string {
	const tiles = sidebar.essentials.map((tile) => tile.id).join(",");
	const sections = sidebar.sections.map((section) => `${section.list}[${section.entries.map(entryKeyOf).join(",")}]`);
	return `${tiles}|${sections.join("|")}`;
}

function entryKeyOf(entry: SidebarEntry): string {
	if (entry.kind === "group") {
		return `${entry.group.id}(${entry.group.items.map((item) => item.tab.id).join(",")})`;
	}

	if (entry.kind === "split") {
		return `${entry.split.id}{${entry.split.members.map((member) => member.item.tab.id).join(",")}}`;
	}

	return entry.tab.id;
}
