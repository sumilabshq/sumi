import type { SidebarEntry, SidebarSection, TabDrop, TabsSidebar } from "@widgetarium/app-host";
import { entryKeysOf, insertedBefore, keyedSpot } from "./sidebar-put-in.js";

export interface Membership {
	readonly id: string;
	readonly splitId: string;
	readonly blockList: string;
	readonly isPinned: boolean;
}

type ListDrop = Extract<TabDrop, { kind: "list" }>;

type SplitEntry = Extract<SidebarEntry, { kind: "split" }>;

const PINNED_LIST = "pinned" satisfies SidebarSection["list"];

export function membershipOf(sidebar: TabsSidebar, id: string): Membership | null {
	const found = sidebar.sections.flatMap((section) =>
		section.entries.flatMap((entry) => membershipIn(entry, section.list, id)),
	);
	return found[0] ?? null;
}

export function isKeptInSplit(sidebar: TabsSidebar, membership: Membership, drop: TabDrop): drop is ListDrop {
	if (drop.kind !== "list" || drop.groupId !== null) {
		return false;
	}

	const isSectionDrop = sidebar.sections.some((section) => section.list === drop.list);
	return isSectionDrop && membership.isPinned !== (membership.blockList === PINNED_LIST);
}

export function withKeptMemberPlaced(sidebar: TabsSidebar, membership: Membership, drop: ListDrop): TabsSidebar {
	const placing = {
		membership,
		drop,
		copy: pinnedCopyOf(sidebar, membership.id),
	};
	return {
		...sidebar,
		sections: sidebar.sections.map((section) =>
			sectionWithKeptPlaced(sectionWithoutCopy(section, membership.id), placing),
		),
	};
}

interface KeptPlacing {
	readonly membership: Membership;
	readonly drop: ListDrop;
	readonly copy: SidebarEntry | null;
}

function sectionWithKeptPlaced(section: SidebarSection, placing: KeptPlacing): SidebarSection {
	if (section.list !== placing.drop.list) {
		return section;
	}

	return {
		...section,
		entries: keptEntriesPlaced(section.entries, placing),
	};
}

function keptEntriesPlaced(
	entries: readonly SidebarEntry[],
	{ membership, drop, copy }: KeptPlacing,
): readonly SidebarEntry[] {
	if (drop.list === membership.blockList) {
		return entriesWithBlockRelisted(entries, membership, drop.before);
	}

	return copy === null ? entries : insertedBefore(entries, copy, keyedSpot(drop.before, entryKeysOf));
}

function membershipIn(entry: SidebarEntry, blockList: string, id: string): readonly Membership[] {
	if (entry.kind !== "split") {
		return [];
	}

	const member = entry.split.members.find((one) => one.item.tab.id === id);
	return member === undefined
		? []
		: [
				{
					id,
					splitId: entry.split.id,
					blockList,
					isPinned: member.isPinned,
				},
			];
}

function pinnedCopyOf(sidebar: TabsSidebar, id: string): SidebarEntry | null {
	const entries = sidebar.sections.flatMap((section) => section.entries);
	return entries.find((entry) => entry.kind === "tab" && entry.tab.id === id) ?? null;
}

function sectionWithoutCopy(section: SidebarSection, id: string): SidebarSection {
	const entries = section.entries.filter((entry) => entry.kind !== "tab" || entry.tab.id !== id);
	return entries.length === section.entries.length
		? section
		: {
				...section,
				entries,
			};
}

function entriesWithBlockRelisted(
	entries: readonly SidebarEntry[],
	membership: Membership,
	before: string | null,
): readonly SidebarEntry[] {
	const at = entries.findIndex((entry) => entry.kind === "split" && entry.split.id === membership.splitId);
	const block = entries[at];

	if (block?.kind !== "split") {
		return entries;
	}

	const relisted = blockRelisted(block, membership);
	const spot = entries.findIndex(keyedSpot(before, entryKeysOf));

	if (spot === -1 || spot >= at) {
		return entries.map((entry) => (entry === block ? relisted : entry));
	}

	const spotted = entries[spot];
	return insertedBefore(
		entries.filter((entry) => entry !== block),
		relisted,
		(entry) => entry === spotted,
	);
}

function blockRelisted(block: SplitEntry, membership: Membership): SplitEntry {
	return {
		kind: "split",
		split: {
			...block.split,
			members: block.split.members.map((member) =>
				member.item.tab.id === membership.id
					? {
							...member,
							isPinned: membership.blockList === PINNED_LIST,
						}
					: member,
			),
		},
	};
}
