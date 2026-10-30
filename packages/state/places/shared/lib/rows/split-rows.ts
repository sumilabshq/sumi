import type { KeptSplit } from "../../schema/splits.schema.js";
import type { GroupItem, SidebarEntry, SplitMember } from "../../schema/tab-rows.schema.js";
import type { SectionList } from "../../schema/tabs.schema.js";
import type { HostTabsMoment } from "../tabs/host-tabs.js";
import { PINNED_LIST, WORKSPACE_LIST, locationOf } from "../tabs/tab-lists.js";
import { splitMapOf } from "../splits/split-map.js";
import { splitOfTab } from "../splits/split-members.js";

export class SplitRows {
	constructor(
		private readonly moment: HostTabsMoment,
		private readonly itemsOf: (id: string) => readonly GroupItem[],
	) {}

	entriesOf(tabId: string, list: SectionList): readonly SidebarEntry[] | null {
		const split = splitOfTab(this.moment, tabId);

		if (split === null) {
			return null;
		}

		const blockList = this.blockListOf(split);

		if (list === blockList) {
			return this.firstIn(split, blockList) === tabId ? [this.blockOf(split)] : [];
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

	private blockListOf(split: KeptSplit): SectionList {
		return split.memberIds.every((id) => this.isPinned(id)) ? PINNED_LIST : WORKSPACE_LIST;
	}

	private firstIn(split: KeptSplit, list: SectionList): string | null {
		const first = (this.moment.lists[list] ?? []).find(
			(entry) => entry.kind === "tab" && split.memberIds.includes(entry.id),
		);
		return first?.id ?? null;
	}

	private isPinned(tabId: string): boolean {
		return locationOf(this.moment, tabId)?.chatId === PINNED_LIST;
	}
}
