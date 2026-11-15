import type { KeptSplit } from "../../schema/splits.schema.js";
import type { SidebarEntry, SidebarTab, SplitMember } from "../../schema/tab-rows.schema.js";
import type { HostTabsMoment } from "../tabs/host-tabs.js";
import { WORKSPACE_LIST } from "../tabs/tab-lists.js";
import { splitMapOf } from "../splits/split-map.js";
import { firstListedMember, splitOfTab } from "../splits/split-members.js";

export class SplitRows {
	constructor(
		private readonly moment: HostTabsMoment,
		private readonly itemsOf: (id: string) => readonly SidebarTab[],
	) {}

	entriesOf(tabId: string, list: string): readonly SidebarEntry[] | null {
		const split = splitOfTab(this.moment, tabId);

		if (split === null) {
			return null;
		}

		if (list === WORKSPACE_LIST) {
			return firstListedMember(this.moment, split, WORKSPACE_LIST) === tabId ? [this.blockOf(split)] : [];
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
			isFocused: split.focusedId === id,
		}));
	}
}
