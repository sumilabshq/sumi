import { newTabPlaceOf } from "../tabs/host-tabs.js";
import type { HostTabsMoment, TabGroup } from "../tabs/host-tabs.js";
import { SECTION_TITLES, WORKSPACE_LIST, findGroup } from "../tabs/tab-lists.js";
import { TabRows } from "./tab-rows.js";
import { artifactIdsOf, isChatList } from "../tabs/chat-lists.js";
import { SplitRows } from "./split-rows.js";
import type {
	PlacedSidebar,
	SidebarEntry,
	SidebarGroup,
	SidebarGroupItem,
	SidebarSection,
	SidebarTab,
} from "../../schema/tab-rows.schema.js";
import type { PageFacts } from "../../schema/screen.schema.js";
import type { ListEntry, SectionList } from "../../schema/tabs.schema.js";

export interface SidebarRowsAsk {
	readonly moment: HostTabsMoment;
	readonly pages: readonly PageFacts[];
	readonly highlightedIds: ReadonlySet<string>;
	readonly elsewhere: readonly string[];
}

export function sidebarOf(ask: SidebarRowsAsk): PlacedSidebar {
	const rows = new TabRows(ask.moment, ask.pages, {
		highlightedIds: ask.highlightedIds,
		elsewhereIds: new Set(ask.elsewhere),
	});
	const entries = new SidebarEntries(ask.moment, rows);
	return {
		sections: [entries.sectionOf(WORKSPACE_LIST)],
		newTabList: newTabPlaceOf(null).chatId,
	};
}

class SidebarEntries {
	private readonly splitRows: SplitRows;

	constructor(
		private readonly moment: HostTabsMoment,
		private readonly rows: TabRows,
	) {
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
			return this.groupsOf(entry.id);
		}

		return this.splitRows.entriesOf(entry.id, list) ?? this.tabsOf(entry.id);
	}

	private tabsOf(id: string): readonly SidebarTab[] {
		return this.rows.rowsOf(id).map((tab) => this.sidebarTabOf(tab));
	}

	private sidebarTabOf(tab: SidebarTab["tab"]): SidebarTab {
		if (!isChatList(this.moment, tab.id)) {
			return {
				kind: "tab",
				tab,
			};
		}

		return {
			kind: "tab",
			tab,
			artifacts: artifactIdsOf(this.moment, tab.id).flatMap((id) => this.rows.rowsOf(id)).map((artifact) => ({ kind: "tab", tab: artifact })),
			isFolded: this.moment.tabs.find((one) => one.id === tab.id)?.isFolded ?? false,
		};
	}

	private groupsOf(id: string): readonly SidebarGroup[] {
		const group = findGroup(this.moment.groups, id);

		if (group === undefined) {
			return [];
		}

		return [
			{
				kind: "group",
				group: {
					...groupFaceOf(group),
					items: group.entries.flatMap((entry): readonly SidebarGroupItem[] =>
						entry.kind === "tab" ? this.tabsOf(entry.id) : this.groupsOf(entry.id),
					),
				},
			},
		];
	}

	private listOf(list: string): readonly ListEntry[] {
		return this.moment.lists[list] ?? [];
	}
}

function groupFaceOf({ id, name, hue, isOpen }: TabGroup): Omit<TabGroup, "entries"> {
	return {
		id,
		name,
		hue,
		isOpen,
	};
}
