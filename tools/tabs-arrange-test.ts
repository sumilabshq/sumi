import type {
	AppTabState,
	SidebarEntry,
	SidebarTab,
	TabChild,
	TabDrop,
	TabsSidebar,
} from "../packages/domain/app-host/index.ts";
import { arrangedSidebar } from "../apps/studio/src/features/app-host/lib/tab-drag/arranged-sidebar.ts";
import type { DragSource } from "../apps/studio/src/features/app-host/lib/tab-drag/drag-source.ts";
import { DragPreview } from "../apps/studio/src/features/app-host/lib/tab-drag/drag-preview.ts";
import { check, tally } from "./check-helpers.ts";

function tabOf(id: string): AppTabState {
	return {
		id,
		app: "browser",
		title: id,
		subtitle: null,
		icon: "site",
		favicon: null,
		status: null,
		label: null,
		address: null,
		isInOwnWindow: false,
		mark: "none",
		isShown: false,
	};
}

function rowOf(id: string, children?: readonly TabChild[]): SidebarTab {
	return children === undefined ? { kind: "tab", tab: tabOf(id) } : { kind: "tab", tab: tabOf(id), children };
}

function splitOf(id: string, members: readonly string[]): SidebarEntry {
	return {
		kind: "split",
		split: {
			id,
			isShown: true,
			map: { cells: [], markedId: members[0] ?? "" },
			members: members.map((member, at) => ({ item: rowOf(member), isPinned: false, isFocused: at === 0 })),
		},
	};
}

const SIDEBAR: TabsSidebar = {
	essentials: [
		{ id: "e1", title: "e1", icon: "site", favicon: null, isShown: false, isLive: true },
		{ id: "e2", title: "e2", icon: "site", favicon: null, isShown: false, isLive: true },
	],
	newTabList: "workspace",
	sections: [
		{ list: "pinned", title: "Pinned", entries: [rowOf("p1")] },
		{
			list: "workspace",
			title: "Recents",
			entries: [
				rowOf("t1"),
				{ kind: "group", group: { id: "g1", name: "G", hue: null, isOpen: true, items: [rowOf("t2"), rowOf("t3")] } },
				splitOf("s3", ["m1", "m2", "m3"]),
				rowOf("chat", [
					{ kind: "tab", tab: tabOf("c1") },
					{ kind: "group", group: { id: "cg", name: "CG", hue: null, isOpen: true, tabs: [tabOf("c2")] } },
				]),
				splitOf("s2", ["n1", "n2"]),
				rowOf("t4"),
			],
		},
	],
};

function tab(id: string, more: Partial<Extract<DragSource, { kind: "tab" }>> = {}): DragSource {
	return { kind: "tab", id, groupId: null, splitId: null, list: "workspace", isChat: false, ...more };
}

function shapeOf(sidebar: TabsSidebar): unknown {
	return {
		essentials: sidebar.essentials.map((tile) => tile.id),
		sections: Object.fromEntries(sidebar.sections.map((section) => [section.list, section.entries.map(entryShapeOf)])),
	};
}

function entryShapeOf(entry: SidebarEntry): unknown {
	if (entry.kind === "group") {
		return { [entry.group.id]: entry.group.items.map((item) => item.tab.id) };
	}

	if (entry.kind === "split") {
		return { [entry.split.id]: entry.split.members.map((member) => member.item.tab.id) };
	}

	if (entry.children === undefined) {
		return entry.tab.id;
	}

	return {
		[entry.tab.id]: entry.children.map((child) =>
			child.kind === "tab" ? child.tab.id : { [child.group.id]: child.group.tabs.map((one) => one.id) },
		),
	};
}

function sectionsOf(sidebar: TabsSidebar): unknown {
	return Reflect.get(Object(shapeOf(sidebar)), "sections");
}

function workspaceOf(sidebar: TabsSidebar): unknown {
	return Reflect.get(Object(Reflect.get(Object(shapeOf(sidebar)), "sections")), "workspace");
}

const CHAT = { chat: ["c1", { cg: ["c2"] }] };

function arranged(source: DragSource, drop: TabDrop, isLanding = false): TabsSidebar {
	return arrangedSidebar(SIDEBAR, { source, drop, isLanding });
}

function isSplitShown(sidebar: TabsSidebar, id: string): boolean | null {
	const entry = sidebar.sections
		.flatMap((section) => section.entries)
		.find((one) => one.kind === "split" && one.split.id === id);
	return entry?.kind === "split" ? entry.split.isShown : null;
}

check(
	"a tab dropped before another moves there and leaves its old place",
	workspaceOf(arranged(tab("t4"), { kind: "list", list: "workspace", groupId: null, before: "t1" })),
	["t4", "t1", { g1: ["t2", "t3"] }, { s3: ["m1", "m2", "m3"] }, CHAT, { s2: ["n1", "n2"] }],
);
check(
	"a tab dropped in a group stands in the group before the named row",
	workspaceOf(arranged(tab("t1"), { kind: "list", list: "workspace", groupId: "g1", before: "t3" })),
	[{ g1: ["t2", "t1", "t3"] }, { s3: ["m1", "m2", "m3"] }, CHAT, { s2: ["n1", "n2"] }, "t4"],
);
check(
	"a row carried out of a group lands at the list's end",
	workspaceOf(arranged(tab("t2", { groupId: "g1" }), { kind: "list", list: "workspace", groupId: null, before: null })),
	["t1", { g1: ["t3"] }, { s3: ["m1", "m2", "m3"] }, CHAT, { s2: ["n1", "n2"] }, "t4", "t2"],
);
check(
	"a tab dropped into a chat becomes its first child",
	workspaceOf(arranged(tab("t4"), { kind: "list", list: "chat", groupId: null, before: "c1" })),
	[
		"t1",
		{ g1: ["t2", "t3"] },
		{ s3: ["m1", "m2", "m3"] },
		{ chat: ["t4", "c1", { cg: ["c2"] }] },
		{ s2: ["n1", "n2"] },
	],
);
check(
	"a chat's grouped child carried before the split leaves its chat group",
	workspaceOf(
		arranged(tab("c2", { list: "chat", groupId: "cg" }), {
			kind: "list",
			list: "workspace",
			groupId: null,
			before: "m2",
		}),
	),
	[
		"t1",
		{ g1: ["t2", "t3"] },
		"c2",
		{ s3: ["m1", "m2", "m3"] },
		{ chat: ["c1", { cg: [] }] },
		{ s2: ["n1", "n2"] },
		"t4",
	],
);
check(
	"a member carried out of a split of three leaves a split of two",
	workspaceOf(
		arranged(tab("m3", { splitId: "s3" }), { kind: "list", list: "workspace", groupId: null, before: "chat" }),
	),
	["t1", { g1: ["t2", "t3"] }, { s3: ["m1", "m2"] }, "m3", CHAT, { s2: ["n1", "n2"] }, "t4"],
);
check(
	"a member carried out of a split of two dissolves it, the other member taking the block's place",
	workspaceOf(arranged(tab("n1", { splitId: "s2" }), { kind: "list", list: "workspace", groupId: null, before: null })),
	["t1", { g1: ["t2", "t3"] }, { s3: ["m1", "m2", "m3"] }, CHAT, "n2", "t4", "n1"],
);
check(
	"a member moved inside its split keeps every member",
	workspaceOf(arranged(tab("m3", { splitId: "s3" }), { kind: "split", splitId: "s3", before: "m1" })),
	["t1", { g1: ["t2", "t3"] }, { s3: ["m3", "m1", "m2"] }, CHAT, { s2: ["n1", "n2"] }, "t4"],
);
check(
	"a tab dropped on Essentials becomes a tile at the asked cell and leaves the list",
	shapeOf(arranged(tab("t1"), { kind: "essentials", at: 1 })),
	{
		essentials: ["e1", "t1", "e2"],
		sections: {
			pinned: ["p1"],
			workspace: [{ g1: ["t2", "t3"] }, { s3: ["m1", "m2", "m3"] }, CHAT, { s2: ["n1", "n2"] }, "t4"],
		},
	},
);
check(
	"an Essential dropped in Pinned leaves the grid and stands there",
	shapeOf(
		arranged({ kind: "essential", id: "e1", at: 0 }, { kind: "list", list: "pinned", groupId: null, before: null }),
	),
	{
		essentials: ["e2"],
		sections: {
			pinned: ["p1", "e1"],
			workspace: ["t1", { g1: ["t2", "t3"] }, { s3: ["m1", "m2", "m3"] }, CHAT, { s2: ["n1", "n2"] }, "t4"],
		},
	},
);
check(
	"a group carried to Pinned moves whole, before the named row",
	shapeOf(
		arranged(
			{ kind: "group", id: "g1", list: "workspace" },
			{ kind: "list", list: "pinned", groupId: null, before: "p1" },
		),
	),
	{
		essentials: ["e1", "e2"],
		sections: {
			pinned: [{ g1: ["t2", "t3"] }, "p1"],
			workspace: ["t1", { s3: ["m1", "m2", "m3"] }, CHAT, { s2: ["n1", "n2"] }, "t4"],
		},
	},
);
const moved = arranged(tab("t4"), { kind: "list", list: "workspace", groupId: null, before: "t1" });
check(
	"what the move does not touch stays the very same object, so its rows skip a render",
	[moved.sections[0] === SIDEBAR.sections[0], moved.sections[1]?.entries[2] === SIDEBAR.sections[1]?.entries[1]],
	[true, true],
);
check(
	"carried off the sidebar, the arrangement is the sidebar itself",
	arranged(tab("t4"), { kind: "own-window" }) === SIDEBAR,
	true,
);

const focusedOut: DragSource = tab("m1", { splitId: "s3" });
const outOfSplit: TabDrop = { kind: "list", list: "workspace", groupId: null, before: null };
check(
	"while carried, a split keeps showing; once its focused member lands outside, the split stops showing",
	[isSplitShown(arranged(focusedOut, outOfSplit), "s3"), isSplitShown(arranged(focusedOut, outOfSplit, true), "s3")],
	[true, false],
);

function twinnedSplitOf(id: string, members: readonly string[], pinned: readonly string[]): SidebarEntry {
	return {
		kind: "split",
		split: {
			id,
			isShown: false,
			map: { cells: [], markedId: members[0] ?? "" },
			members: members.map((member, at) => ({
				item: rowOf(member),
				isPinned: pinned.includes(member),
				isFocused: at === 0,
			})),
		},
	};
}

function twinOf(id: string, splitId: string): SidebarEntry {
	return { ...rowOf(id), splitMark: { id: splitId, map: { cells: [], markedId: id } } };
}

const TWINNED: TabsSidebar = {
	essentials: [],
	newTabList: "workspace",
	sections: [
		{ list: "pinned", title: "Pinned", entries: [rowOf("p1"), twinOf("m2", "s3"), twinOf("n2", "s2")] },
		{
			list: "workspace",
			title: "Recents",
			entries: [
				rowOf("t1"),
				twinnedSplitOf("s3", ["m1", "m2", "m3"], ["m2"]),
				twinnedSplitOf("s2", ["n1", "n2"], ["n2"]),
			],
		},
	],
};

function twinnedArranged(source: DragSource, drop: TabDrop): TabsSidebar {
	return arrangedSidebar(TWINNED, { source, drop, isLanding: false });
}

function splitMarkOf(sidebar: TabsSidebar, id: string): unknown {
	const row = sidebar.sections
		.flatMap((section) => section.entries)
		.find((entry) => entry.kind === "tab" && entry.tab.id === id);
	return row?.kind === "tab" ? (row.splitMark ?? null) : undefined;
}

check(
	"a pinned twin carried inside Pinned moves alone, its split keeping the member",
	sectionsOf(
		twinnedArranged(tab("m2", { list: "pinned" }), { kind: "list", list: "pinned", groupId: null, before: "p1" }),
	),
	{ pinned: ["m2", "p1", "n2"], workspace: ["t1", { s3: ["m1", "m2", "m3"] }, { s2: ["n1", "n2"] }] },
);
function pinnedMembersOf(sidebar: TabsSidebar, id: string): unknown {
	const entry = sidebar.sections
		.flatMap((section) => section.entries)
		.find((one) => one.kind === "split" && one.split.id === id);
	return entry?.kind === "split"
		? entry.split.members.filter((member) => member.isPinned).map((member) => member.item.tab.id)
		: null;
}

const fromBlockToOpen = twinnedArranged(tab("m2", { splitId: "s3" }), {
	kind: "list",
	list: "workspace",
	groupId: null,
	before: null,
});
check(
	"a pinned member of a mixed split carried from its block into Open stays in the split, unpinned, and leaves Pinned",
	[sectionsOf(fromBlockToOpen), pinnedMembersOf(fromBlockToOpen, "s3")],
	[{ pinned: ["p1", "n2"], workspace: ["t1", { s3: ["m1", "m2", "m3"] }, { s2: ["n1", "n2"] }] }, []],
);
const fromCopyToOpen = twinnedArranged(tab("m2", { list: "pinned" }), {
	kind: "list",
	list: "workspace",
	groupId: null,
	before: "t1",
});
check(
	"a pinned member's Pinned copy carried above Open's first row takes its split block there, once",
	[sectionsOf(fromCopyToOpen), pinnedMembersOf(fromCopyToOpen, "s3")],
	[{ pinned: ["p1", "n2"], workspace: [{ s3: ["m1", "m2", "m3"] }, "t1", { s2: ["n1", "n2"] }] }, []],
);

const ALL_PINNED: TabsSidebar = {
	essentials: [],
	newTabList: "workspace",
	sections: [
		{
			list: "pinned",
			title: "Pinned",
			entries: [rowOf("p1"), twinnedSplitOf("s4", ["q1", "q2", "q3"], ["q1", "q2", "q3"])],
		},
		{ list: "workspace", title: "Recents", entries: [rowOf("t1")] },
	],
};
check(
	"a member of a split standing whole in Pinned, carried into Open, leaves the split",
	sectionsOf(
		arrangedSidebar(ALL_PINNED, {
			source: tab("q2", { list: "pinned", splitId: "s4" }),
			drop: { kind: "list", list: "workspace", groupId: null, before: null },
			isLanding: false,
		}),
	),
	{ pinned: ["p1", { s4: ["q1", "q3"] }], workspace: ["t1", "q2"] },
);
const dissolved = twinnedArranged(tab("n1", { splitId: "s2" }), {
	kind: "list",
	list: "workspace",
	groupId: null,
	before: "t1",
});
check(
	"a split of two dissolving around a pinned member leaves that member once, in Pinned, unmarked",
	[sectionsOf(dissolved), splitMarkOf(dissolved, "n2")],
	[{ pinned: ["p1", "m2", "n2"], workspace: ["n1", "t1", { s3: ["m1", "m2", "m3"] }] }, null],
);

Reflect.set(globalThis, "window", globalThis);
const preview = new DragPreview();
const toEnd: TabDrop = { kind: "list", list: "workspace", groupId: null, before: null };
const firstLift = preview.lift(tab("t1"), toEnd);
preview.land(firstLift, () => undefined);
const secondLift = preview.lift(tab("t4"), toEnd);
preview.rest(firstLift);
preview.glided(firstLift);
preview.committed(firstLift);
const carriedOn = preview.now();
preview.land(secondLift, () => undefined);
preview.glided(firstLift);
preview.committed(firstLift);
preview.heard({ ...SIDEBAR, essentials: [] });
check(
	"a landing still running when the next drag lifts neither ends that drag nor settles its landing",
	[carriedOn?.source.id, carriedOn?.isLanding, preview.now()?.source.id, preview.now()?.isLanding],
	["t4", false, "t4", true],
);
preview.rest(secondLift);

function withOpenRows(sidebar: TabsSidebar, entries: readonly SidebarEntry[]): TabsSidebar {
	return {
		...sidebar,
		sections: sidebar.sections.map((section) => (section.list === "workspace" ? { ...section, entries } : section)),
	};
}

const OPEN_ROWS = SIDEBAR.sections[1]?.entries ?? [];
const answering = new DragPreview();
answering.heard(SIDEBAR);
const answeringLift = answering.lift(tab("t1"), toEnd);
answering.land(answeringLift, () => undefined);
answering.glided(answeringLift);
answering.committed(answeringLift);
answering.heard(withOpenRows(SIDEBAR, [...OPEN_ROWS, rowOf("t9")]));
const isLandingThroughOtherChange = answering.now()?.isLanding;
answering.heard(withOpenRows(SIDEBAR, [...OPEN_ROWS.slice(1), rowOf("t9"), rowOf("t1")]));
check(
	"a landing waits through a change that leaves its tab in place, and rests once its tab moves",
	[isLandingThroughOtherChange, answering.now()],
	[true, null],
);

console.log(tally.failed ? `tabs arrange: ${tally.failed} check(s) failed` : "tabs arrange: all checks passed");
process.exit(tally.failed ? 1 : 0);
