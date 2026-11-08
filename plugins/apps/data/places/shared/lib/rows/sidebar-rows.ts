import { newTabPlaceOf } from "../tabs/host-tabs.js";
import type { HostTabsMoment, TabGroup } from "../tabs/host-tabs.js";
import { PINNED_LIST, SECTION_TITLES, WORKSPACE_LIST, findGroup } from "../tabs/tab-lists.js";
import { TabRows } from "./tab-rows.js";
import { SplitRows } from "./split-rows.js";
import { holderIdsOf } from "../tabs/app-abilities.js";
import type {
	Essential,
	PlacedSidebar,
	SidebarEntry,
	SidebarSection,
	SidebarTab,
	TabChild,
} from "../../schema/tab-rows.schema.js";
import type { PageFacts } from "../../schema/screen.schema.js";
import type { ListEntry, SectionList } from "../../schema/tabs.schema.js";

export interface SidebarRowsAsk {
	readonly moment: HostTabsMoment;
	readonly essentials: readonly Essential[];
	readonly pages: readonly PageFacts[];
	readonly highlightedIds: ReadonlySet<string>;
	readonly elsewhere: readonly string[];
}

const SECTION_ORDER: readonly SectionList[] = [PINNED_LIST, WORKSPACE_LIST];

export function sidebarOf(ask: SidebarRowsAsk): PlacedSidebar {
	const rows = new TabRows(ask.moment, ask.pages, {
		highlightedIds: ask.highlightedIds,
		elsewhereIds: new Set(ask.elsewhere),
	});
	const entries = new SidebarEntries(ask.moment, rows);
	return {
		essentials: ask.essentials.map((essential) => rows.tileOf(essential)),
		sections: SECTION_ORDER.map((list) => entries.sectionOf(list)),
		newTabList: newTabPlaceOf(ask.moment, null).chatId,
	};
}

class SidebarEntries {
	private readonly holderIds: ReadonlySet<string>;
	private readonly foldedIds: ReadonlySet<string>;
	private readonly splitRows: SplitRows;

	constructor(
		private readonly moment: HostTabsMoment,
		private readonly rows: TabRows,
	) {
		this.holderIds = holderIdsOf(moment.apps, moment.tabs);
		this.foldedIds = new Set(moment.tabs.filter((tab) => tab.isFolded).map((tab) => tab.id));
		this.splitRows = new SplitRows(moment, (id) => this.tabsOf(id));
	}

	sectionOf(list: SectionList): SidebarSection {
		return {
			list,
			title: SECTION_TITLES[list],
			entries: this.listOf(list).flatMap((entry) => this.entriesOf(entry, list)),
		};
	}

	private entriesOf(entry: ListEntry, list: SectionList): readonly SidebarEntry[] {
		if (entry.kind === "group") {
			return this.groupsOf(entry.id).map((group) => this.topGroupOf(group));
		}

		return this.splitRows.entriesOf(entry.id, list) ?? this.tabsOf(entry.id);
	}

	private tabsOf(id: string): readonly SidebarTab[] {
		return this.rows.rowsOf(id).map((tab) => this.sidebarTabOf(tab));
	}

	private sidebarTabOf(tab: SidebarTab["tab"]): SidebarTab {
		if (!this.holderIds.has(tab.id)) {
			return {
				kind: "tab",
				tab,
			};
		}

		return {
			kind: "tab",
			tab,
			children: this.listOf(tab.id).flatMap((child) => this.childrenOf(child)),
			isFolded: this.foldedIds.has(tab.id),
		};
	}

	private childrenOf(entry: ListEntry): readonly TabChild[] {
		if (entry.kind === "tab") {
			return this.rows.rowsOf(entry.id).map((tab) => ({
				kind: "tab",
				tab,
			}));
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
				items: group.tabIds.flatMap((id) => this.tabsOf(id)),
			},
		};
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
