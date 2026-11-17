import type { StripItem } from "@sumi/tab-strip-plugin";

export function draggedItemOf(items: readonly StripItem[], id: string): StripItem | null {
	for (const item of items) {
		if (item.kind === "tab" && item.tab.id === id) {
			return item;
		}

		const member = item.kind === "split" ? item.split.members.find(({ item: one }) => one.tab.id === id) : undefined;

		if (item.kind === "split" && member !== undefined) {
			return {
				kind: "tab",
				tab: member.item.tab,
				list: item.list,
				groupId: null,
				group: null,
			};
		}
	}

	return null;
}
