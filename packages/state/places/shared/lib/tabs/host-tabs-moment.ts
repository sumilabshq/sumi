import type {
	AppAction,
	AppKind,
	GroupHue,
	HeldList,
	ListEntry,
	TabHistory,
	TabMark,
} from "../../schema/tabs.schema.js";
import type { KeptSplit } from "../../schema/splits.schema.js";
import {
	WORKSPACE_LIST,
	chatOfGroup,
	isSectionList,
	findGroup,
	freeGroupNameOf,
	locationOf,
	placeOfLocation,
	tabEntryOf,
	withEntryBefore,
	withoutTab,
} from "./tab-lists.js";
import { abilitiesOf } from "./app-abilities.js";
import type { TabGroup, TabLayout, TabLocation, TabPlace } from "./tab-lists.js";

export interface OpenedTab {
	readonly app: AppKind;
	readonly pageId: string | null;
}

export interface HostTab extends OpenedTab {
	readonly id: string;
	readonly label: string | null;
	readonly essentialId: string | null;
	readonly lastAddress: string | null;
	readonly lastTitle: string | null;
	readonly lastFavicon: string | null;
	readonly lastActions?: AppAction[] | undefined;
	readonly history?: TabHistory | undefined;
	readonly title: string | null;
	readonly mark: TabMark;
	readonly isFolded: boolean;
}

export interface TabPage {
	readonly pageId: string;
	readonly address: string;
}

export interface ClosedTab {
	readonly tab: HostTab;
	readonly chatId: string | null;
	readonly groupId: string | null;
	readonly at: number;
	readonly address: string;
	readonly held: HeldList | null;
}

export interface HostTabsMoment extends TabLayout {
	readonly tabs: readonly HostTab[];
	readonly shownId: string | null;
	readonly lastShown: Readonly<Record<string, string>>;
	readonly minted: number;
	readonly closed: readonly ClosedTab[];
	readonly splits: readonly KeptSplit[];
	readonly mintedSplits: number;
	readonly shownSplitId: string | null;
}

export interface GroupChange {
	readonly name?: string;
	readonly hue?: GroupHue | null;
	readonly isOpen?: boolean;
}

export const CLOSED_KEPT = 20;

export function emptyMoment(): HostTabsMoment {
	return {
		tabs: [],
		lists: {},
		groups: [],
		shownId: null,
		lastShown: {},
		minted: 0,
		closed: [],
		splits: [],
		mintedSplits: 0,
		shownSplitId: null,
	};
}

export function withoutGroup(layout: TabLayout, groupId: string, spilled: readonly string[]): TabLayout {
	const chatId = chatOfGroup(layout, groupId);

	if (chatId === null) {
		return layout;
	}

	return {
		lists: {
			...layout.lists,
			[chatId]: (layout.lists[chatId] ?? []).flatMap((entry) =>
				entry.kind === "group" && entry.id === groupId ? spilled.map(tabEntryOf) : [entry],
			),
		},
		groups: layout.groups.filter((group) => group.id !== groupId),
	};
}

export function reopenPlaceOf(layout: TabLayout, closed: ClosedTab, chatId: string): TabPlace {
	if (closed.chatId === null || (closed.chatId !== chatId && !isSectionList(closed.chatId))) {
		return {
			chatId: WORKSPACE_LIST,
			groupId: null,
			before: null,
		};
	}

	const isGroupKept = closed.groupId !== null && findGroup(layout.groups, closed.groupId) !== undefined;
	return placeOfLocation(layout, {
		chatId: closed.chatId,
		groupId: isGroupKept ? closed.groupId : null,
		at: closed.at,
	});
}

export function lastShownWith(
	lastShown: Readonly<Record<string, string>>,
	chatId: string,
	id: string,
): Readonly<Record<string, string>> {
	return {
		...lastShown,
		[chatId]: id,
	};
}

export function keptClosed(closed: readonly ClosedTab[], closing: readonly ClosedTab[]): readonly ClosedTab[] {
	const all = [...closed, ...closing];
	const evicted = new Set(all.filter((one) => !isArchive(one)).slice(0, -CLOSED_KEPT));
	return all.filter((one) => !evicted.has(one));
}

export function labelSaid(label: string | null): string {
	return label === null ? "no label" : `"${label}"`;
}

export function closedPlaceOf(location: TabLocation | null): Pick<ClosedTab, "chatId" | "groupId" | "at"> {
	if (location === null) {
		return {
			chatId: null,
			groupId: null,
			at: 0,
		};
	}

	return {
		chatId: location.chatId,
		groupId: location.groupId,
		at: location.at,
	};
}

export interface GroupBirth {
	readonly chatId: string;
	readonly withTabId: string | null;
}

export function newGroupOf(moment: HostTabsMoment, { chatId, withTabId }: GroupBirth): TabGroup {
	return {
		id: `group-${moment.minted + 1}`,
		name: freeGroupNameOf(moment, chatId),
		hue: null,
		isOpen: true,
		tabIds: withTabId === null ? [] : [withTabId],
	};
}

export function groupedMoment(moment: HostTabsMoment, group: TabGroup, birth: GroupBirth): HostTabsMoment {
	const layout = birth.withTabId === null ? moment : withoutTab(moment, birth.withTabId);
	const entry: ListEntry = {
		kind: "group",
		id: group.id,
	};
	return {
		...moment,
		lists: withEntryBefore(layout.lists, birth.chatId, entry, groupBeforeOf(moment, birth)),
		groups: [...layout.groups, group],
		minted: moment.minted + 1,
	};
}

export function isSameGroupFace(one: TabGroup, other: TabGroup): boolean {
	return one.name === other.name && one.hue === other.hue && one.isOpen === other.isOpen;
}

export function groupChangeSaid(group: TabGroup, next: TabGroup): string {
	return `group ${group.id} "${group.name}" ${groupFaceSaid(group)} → "${next.name}" ${groupFaceSaid(next)}`;
}

function groupFaceSaid(group: TabGroup): string {
	return `${group.hue ?? "grey"} ${group.isOpen ? "open" : "shut"}`;
}

function groupBeforeOf(moment: HostTabsMoment, { chatId, withTabId }: GroupBirth): string | null {
	const location = withTabId === null ? null : locationOf(moment, withTabId);

	if (location === null || location.groupId !== null) {
		return null;
	}

	return moment.lists[chatId]?.[location.at + 1]?.id ?? null;
}

function isArchive({ tab }: ClosedTab): boolean {
	return abilitiesOf(tab.app).keepsRecord;
}
