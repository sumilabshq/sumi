import type { SidebarEntry, TabChild, TabsSidebar } from "@widgetarium/app-host";

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

	return entry.children === undefined ? entry.tab.id : `${entry.tab.id}<${entry.children.map(childKeyOf).join(",")}>`;
}

function childKeyOf(child: TabChild): string {
	return child.kind === "tab" ? child.tab.id : `${child.group.id}(${child.group.tabs.map((tab) => tab.id).join(",")})`;
}
