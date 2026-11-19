import type { SidebarGroupItem, TabsSidebar } from "@widgetarium/app-host/contract";
import { SPLIT_ROW } from "./sidebar-drops.js";
import type { Carried, Holder } from "./sidebar-drops.js";

export interface DropRefused {
	readonly anchorId: string;
	readonly words: string;
}

const PAGE_HOLDS_GROUP = "A page can't hold a group";
const PAGE_WITH_SUB_PAGES = "A page with sub-pages can't be a sub-page";
const SPLIT_HOLDS_GROUP = "A split can't hold a group";
const SPLIT_HOLDS_SPLIT = "A split can't hold a split";

export function refusedDropOf(sidebar: TabsSidebar, carried: Carried | null, holder: Holder | null): DropRefused | null {
	if (carried === null || holder === null) {
		return null;
	}

	if (holder.kind === "split") {
		const words = carried.node.kind === "group" ? SPLIT_HOLDS_GROUP : carried.node.kind === "split" ? SPLIT_HOLDS_SPLIT : null;
		return words === null ? null : { anchorId: `${SPLIT_ROW}${holder.splitId}`, words };
	}

	if (holder.kind !== "list" || !isPageRow(sidebar, holder.list)) {
		return null;
	}

	if (carried.node.kind === "group") {
		return { anchorId: holder.list, words: PAGE_HOLDS_GROUP };
	}

	return carried.node.kind === "tab" && (carried.node.subPages?.length ?? 0) > 0
		? { anchorId: holder.list, words: PAGE_WITH_SUB_PAGES }
		: null;
}

function isPageRow(sidebar: TabsSidebar, id: string): boolean {
	return sidebar.sections.some(({ entries }) => entries.some((entry) => holdsPageRow(entry, id)));
}

function holdsPageRow(item: SidebarGroupItem, id: string): boolean {
	if (item.kind === "tab") {
		return item.tab.id === id && item.subPages !== undefined;
	}

	if (item.kind === "split") {
		return item.split.members.some((member) => holdsPageRow(member.item, id));
	}

	return item.group.items.some((inner) => holdsPageRow(inner, id));
}
