import { newTabPlaceOf } from "../tabs/host-tabs.js";
import type { HostTabsMoment, TabGroup } from "../tabs/host-tabs.js";
import { PINNED_LIST, WORKSPACE_LIST, findGroup } from "../tabs/tab-lists.js";
import { TabRows, shownIdsOf } from "./tab-rows.js";
import type {
	ChatChild,
	Essential,
	GroupItem,
	PlacedSidebar,
	SidebarEntry,
	SidebarSection,
	SidebarTab,
} from "../../schema/tab-rows.schema.js";
import type { PageFacts } from "../../schema/screen.schema.js";
import type { ListEntry, PageApp, SectionList } from "../../schema/tabs.schema.js";

export interface SidebarRowsAsk {
	readonly moment: HostTabsMoment;
	readonly essentials: readonly Essential[];
	readonly pages: readonly PageFacts[];
	readonly shownApp: PageApp | null;
	readonly inPanes: readonly string[];
	readonly hasShownTabPane: boolean;
	readonly elsewhere: readonly string[];
	readonly boardChatIds: readonly string[];
}

const SECTION_ORDER: readonly SectionList[] = [PINNED_LIST, WORKSPACE_LIST];

export function sidebarOf(ask: SidebarRowsAsk): PlacedSidebar {
	const rows = new TabRows(ask.moment, ask.pages, {
		shownIds: shownIdsOf(ask.moment, ask.hasShownTabPane ? ask.shownApp : null, ask.inPanes),
		elsewhereIds: new Set(ask.elsewhere),
	});
	const entries = new SidebarEntries(ask.moment, rows, new Set(ask.boardChatIds));
	return {
		essentials: ask.essentials.map((essential) => rows.tileOf(essential)),
		sections: SECTION_ORDER.map((list) => entries.sectionOf(list)),
		newTabList: newTabPlaceOf(ask.moment, null).chatId,
	};
}

class SidebarEntries {
	private readonly chatIds: ReadonlySet<string>;

	constructor(
		private readonly moment: HostTabsMoment,
		private readonly rows: TabRows,
		private readonly boardChatIds: ReadonlySet<string>,
	) {
		this.chatIds = new Set(moment.tabs.filter((tab) => tab.app === "chat").map((tab) => tab.id));
	}

	sectionOf(list: SectionList): SidebarSection {
		return {
			list,
			entries: this.listOf(list).flatMap((entry) => this.entriesOf(entry)),
		};
	}

	private entriesOf(entry: ListEntry): readonly SidebarEntry[] {
		if (entry.kind === "group") {
			return this.groupsOf(entry.id).map((group) => this.topGroupOf(group));
		}

		return this.itemsOf(entry.id);
	}

	private itemsOf(id: string): readonly GroupItem[] {
		return this.chatIds.has(id) ? [this.chatOf(id)] : this.tabsOf(id);
	}

	private chatOf(id: string): GroupItem {
		return {
			kind: "chat",
			chat: {
				id,
				label: this.moment.tabs.find((tab) => tab.id === id)?.label ?? null,
				isShown: this.boardChatIds.has(id),
				children: this.listOf(id).flatMap((child) => this.childrenOf(child)),
			},
		};
	}

	private childrenOf(entry: ListEntry): readonly ChatChild[] {
		if (entry.kind === "tab") {
			return this.tabsOf(entry.id);
		}

		return this.groupsOf(entry.id).map((group) => ({
			kind: "group",
			group: {
				...groupWithoutTabsOf(group),
				tabs: group.tabIds.flatMap((id) => this.rows.rowsOf(id)),
			},
		}));
	}

	private topGroupOf(group: TabGroup): SidebarEntry {
		return {
			kind: "group",
			group: {
				...groupWithoutTabsOf(group),
				items: group.tabIds.flatMap((id) => this.itemsOf(id)),
			},
		};
	}

	private tabsOf(id: string): readonly SidebarTab[] {
		return this.rows.rowsOf(id).map((tab) => ({
			kind: "tab",
			tab,
		}));
	}

	private groupsOf(id: string): readonly TabGroup[] {
		const group = findGroup(this.moment.groups, id);
		return group === undefined ? [] : [group];
	}

	private listOf(list: string): readonly ListEntry[] {
		return this.moment.lists[list] ?? [];
	}
}

function groupWithoutTabsOf({ id, name, hue, isOpen }: TabGroup): Omit<TabGroup, "tabIds"> {
	return {
		id,
		name,
		hue,
		isOpen,
	};
}
