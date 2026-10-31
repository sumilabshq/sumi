import type { SidebarEntry, SidebarTab, TabChild, TabsSidebar } from "@widgetarium/app-host";

type Container = readonly [string, readonly string[]];

export function sourceSpotOf(sidebar: TabsSidebar, id: string): string {
	return containersOf(sidebar)
		.flatMap(([name, ids]) => ids.flatMap((one, at) => (one === id ? [`${name}:${at}`] : [])))
		.join(",");
}

function containersOf(sidebar: TabsSidebar): readonly Container[] {
	const tiles: Container = ["essentials", sidebar.essentials.map((tile) => tile.id)];
	const sections = sidebar.sections.flatMap((section) => [
		[`list:${section.list}`, section.entries.map(entryIdOf)] as const,
		...section.entries.flatMap(entryContainersOf),
	]);
	return [tiles, ...sections];
}

function entryIdOf(entry: SidebarEntry): string {
	if (entry.kind === "group") {
		return entry.group.id;
	}

	return entry.kind === "split" ? entry.split.id : entry.tab.id;
}

function entryContainersOf(entry: SidebarEntry): readonly Container[] {
	if (entry.kind === "group") {
		return [
			[`group:${entry.group.id}`, entry.group.items.map((item) => item.tab.id)],
			...entry.group.items.flatMap(childContainersOf),
		];
	}

	if (entry.kind === "split") {
		const items = entry.split.members.map((member) => member.item);
		return [[`split:${entry.split.id}`, items.map((item) => item.tab.id)], ...items.flatMap(childContainersOf)];
	}

	return childContainersOf(entry);
}

function childContainersOf(item: SidebarTab): readonly Container[] {
	if (item.children === undefined) {
		return [];
	}

	const groups = item.children.flatMap((child) => (child.kind === "group" ? [child.group] : []));
	return [
		[`chat:${item.tab.id}`, item.children.map(childIdOf)],
		...groups.map((group): Container => [`group:${group.id}`, group.tabs.map((tab) => tab.id)]),
	];
}

function childIdOf(child: TabChild): string {
	return child.kind === "tab" ? child.tab.id : child.group.id;
}
