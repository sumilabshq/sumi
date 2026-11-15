import type { SidebarEntry, TabDrop, TabsSidebar } from "@widgetarium/app-host/contract";
import { entryKeysOf } from "./sidebar-put-in.js";

type Container = readonly [string, readonly string[]];

type ListDrop = Extract<TabDrop, { kind: "list" }>;

export function placedIdOf(sidebar: TabsSidebar, drop: TabDrop): string | null {
	if (drop.kind === "essentials") {
		return sidebar.essentials[Math.min(drop.at, sidebar.essentials.length - 1)]?.id ?? null;
	}

	return drop.kind === "list" ? listedIdOf(sidebar, drop) : null;
}

export function hasId(sidebar: TabsSidebar, id: string): boolean {
	return (
		sidebar.essentials.some((tile) => tile.id === id) ||
		containersOf(sidebar).some(([, ids]) => ids.includes(id)) ||
		sidebar.sections.some((section) => section.entries.some((entry) => entryKeysOf(entry).includes(id)))
	);
}

function listedIdOf(sidebar: TabsSidebar, drop: ListDrop): string | null {
	const ids = containersOf(sidebar).find(([name]) => name === containerNameOf(drop))?.[1] ?? [];
	const before = drop.before === null ? -1 : ids.indexOf(drop.before);
	return (before === -1 ? ids.at(-1) : ids[before - 1]) ?? null;
}

function containerNameOf(drop: ListDrop): string {
	if (drop.groupId !== null) {
		return `group:${drop.groupId}`;
	}

	return `list:${drop.list}`;
}

function containersOf(sidebar: TabsSidebar): readonly Container[] {
	return sidebar.sections.flatMap((section) => [
		[`list:${section.list}`, section.entries.map(entryIdOf)] as const,
		...section.entries.flatMap(entryContainersOf),
	]);
}

function entryIdOf(entry: SidebarEntry): string {
	if (entry.kind === "group") {
		return entry.group.id;
	}

	return entry.kind === "split" ? entry.split.id : entry.tab.id;
}

function entryContainersOf(entry: SidebarEntry): readonly Container[] {
	if (entry.kind !== "group") {
		return [];
	}

	return [[`group:${entry.group.id}`, entry.group.items.map((item) => item.tab.id)]];
}
