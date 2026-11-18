import type { SidebarGroupItem, TabsSidebar } from "@widgetarium/app-host/contract";
import type { Carried, Placed } from "./sidebar-drops.js";

export interface DropRefused {
	readonly chatId: string;
	readonly words: string;
}

const CHAT_HOLDS_CHAT = "A chat can't hold a chat";
const CHAT_HOLDS_GROUP = "A chat can't hold a group";

export function refusedDropOf(
	sidebar: TabsSidebar,
	carried: Carried | null,
	placed: Placed | null,
): DropRefused | null {
	if (carried === null || placed === null) {
		return null;
	}

	const list = listOfPlaced(placed);

	if (list === null || !isChatRow(sidebar, list)) {
		return null;
	}

	if (placed.kind === "group") {
		return {
			chatId: list,
			words: CHAT_HOLDS_GROUP,
		};
	}

	return carried.node.kind === "tab" && carried.node.artifacts !== undefined
		? {
				chatId: list,
				words: CHAT_HOLDS_CHAT,
			}
		: null;
}

function listOfPlaced(placed: Placed): string | null {
	if (placed.kind === "group") {
		return placed.to.list;
	}

	return placed.to.kind === "list" ? placed.to.list : null;
}

function isChatRow(sidebar: TabsSidebar, id: string): boolean {
	return sidebar.sections.some(({ entries }) =>
		entries.some((entry) => entry.kind !== "split" && holdsChatRow(entry, id)),
	);
}

function holdsChatRow(item: SidebarGroupItem, id: string): boolean {
	if (item.kind === "tab") {
		return item.tab.id === id && item.artifacts !== undefined;
	}

	return item.group.items.some((inner) => holdsChatRow(inner, id));
}
