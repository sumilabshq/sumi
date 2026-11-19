import type { SidebarGroupItem, TabsSidebar } from "@widgetarium/app-host/contract";
import type { Carried, Placed } from "./sidebar-drops.js";

export interface DropRefused {
	readonly pageId: string;
	readonly words: string;
}

const PAGE_HOLDS_GROUP = "A page can't hold a group";
const PAGE_WITH_SUB_PAGES = "A page with sub-pages can't be a sub-page";

export function refusedDropOf(
	sidebar: TabsSidebar,
	carried: Carried | null,
	placed: Placed | null,
): DropRefused | null {
	if (carried === null || placed === null) {
		return null;
	}

	const list = listOfPlaced(placed);

	if (list === null || !isPageRow(sidebar, list)) {
		return null;
	}

	if (placed.kind === "group") {
		return {
			pageId: list,
			words: PAGE_HOLDS_GROUP,
		};
	}

	return carried.node.kind === "tab" && (carried.node.subPages?.length ?? 0) > 0
		? {
				pageId: list,
				words: PAGE_WITH_SUB_PAGES,
			}
		: null;
}

function listOfPlaced(placed: Placed): string | null {
	if (placed.kind === "group") {
		return placed.to.list;
	}

	return placed.to.kind === "list" ? placed.to.list : null;
}

function isPageRow(sidebar: TabsSidebar, id: string): boolean {
	return sidebar.sections.some(({ entries }) =>
		entries.some((entry) => entry.kind !== "split" && holdsPageRow(entry, id)),
	);
}

function holdsPageRow(item: SidebarGroupItem, id: string): boolean {
	if (item.kind === "tab") {
		return item.tab.id === id && item.subPages !== undefined;
	}

	return item.group.items.some((inner) => holdsPageRow(inner, id));
}
