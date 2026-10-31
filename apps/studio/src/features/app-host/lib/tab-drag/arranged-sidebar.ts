import type { SidebarEntry, SidebarSplitState, TabDrop, TabsSidebar } from "@widgetarium/app-host";
import type { DragSource } from "./drag-source.js";
import { insertedBefore, keyedSpot, putIn } from "./sidebar-put-in.js";
import { takenOut } from "./sidebar-take-out.js";
import { isKeptInSplit, membershipOf, withKeptMemberPlaced } from "./kept-member.js";

type SplitDrop = Extract<TabDrop, { kind: "split" }>;

export interface Aimed {
	readonly source: DragSource;
	readonly drop: TabDrop;
	readonly isLanding: boolean;
}

export function arrangedSidebar(sidebar: TabsSidebar, { source, drop, isLanding }: Aimed): TabsSidebar {
	if (drop.kind === "own-window") {
		return sidebar;
	}

	if (drop.kind === "split") {
		return withMemberMoved(sidebar, source.id, drop);
	}

	const membership = source.kind === "tab" ? membershipOf(sidebar, source.id) : null;

	if (membership !== null && isKeptInSplit(sidebar, membership, drop)) {
		return withKeptMemberPlaced(sidebar, membership, drop);
	}

	const { sidebar: without, carried } = takenOut(sidebar, {
		source,
		splitId: membership?.splitId ?? null,
		isLanding,
	});
	return carried === null ? sidebar : putIn(without, carried, drop);
}

function withMemberMoved(sidebar: TabsSidebar, id: string, drop: SplitDrop): TabsSidebar {
	return {
		...sidebar,
		sections: sidebar.sections.map((section) => ({
			...section,
			entries: section.entries.map((entry) => entryWithMemberMoved(entry, id, drop)),
		})),
	};
}

function entryWithMemberMoved(entry: SidebarEntry, id: string, drop: SplitDrop): SidebarEntry {
	if (entry.kind !== "split" || entry.split.id !== drop.splitId) {
		return entry;
	}

	return {
		kind: "split",
		split: splitWithMemberMoved(entry.split, id, drop.before),
	};
}

function splitWithMemberMoved(split: SidebarSplitState, id: string, before: string | null): SidebarSplitState {
	const moved = split.members.find((member) => member.item.tab.id === id);

	if (moved === undefined) {
		return split;
	}

	const others = split.members.filter((member) => member !== moved);
	return {
		...split,
		members: insertedBefore(
			others,
			moved,
			keyedSpot(before, (member) => [member.item.tab.id]),
		),
	};
}
