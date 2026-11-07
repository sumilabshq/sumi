import type { KeptSplit } from "../../schema/splits.schema.js";
import type { SidebarEntry, SidebarTab, SplitMember } from "../../schema/tab-rows.schema.js";
import type { SectionList } from "../../schema/tabs.schema.js";
import type { HostTabsMoment } from "../tabs/host-tabs.js";
import { PINNED_LIST, locationOf } from "../tabs/tab-lists.js";
import { splitMapOf } from "../splits/split-map.js";
import { blockListOf, firstListedMember, splitOfTab } from "../splits/split-members.js";

export class SplitRows {
	constructor(
		private readonly moment: HostTabsMoment,
		private readonly itemsOf: (id: string) => readonly SidebarTab[],
	) {}

	entriesOf(tabId: string, list: SectionList): readonly SidebarEntry[] | null {
		const split = splitOfTab(this.moment, tabId);

		if (split === null) {
			return null;
		}

		const blockList = blockListOf(this.moment, split);

		if (list === blockList) {
			return firstListedMember(this.moment, split, blockList) === tabId ? [this.blockOf(split)] : [];
		}

		return this.itemsOf(tabId).map((item) => ({
			...item,
			splitMark: { id: split.id, map: splitMapOf(split.layout, tabId) },
		}));
	}

	private blockOf(split: KeptSplit): SidebarEntry {
		return {
			kind: "split",
			split: {
				id: split.id,
				isShown: this.moment.shownSplitId === split.id,
				map: splitMapOf(split.layout, split.focusedId),
				members: split.memberIds.flatMap((id) => this.membersOf(split, id)),
			},
		};
	}

	private membersOf(split: KeptSplit, id: string): readonly SplitMember[] {
		return this.itemsOf(id).map((item) => ({
			item,
			isPinned: this.isPinned(id),
			isFocused: split.focusedId === id,
		}));
	}

	private isPinned(tabId: string): boolean {
		return locationOf(this.moment, tabId)?.chatId === PINNED_LIST;
	}
}
