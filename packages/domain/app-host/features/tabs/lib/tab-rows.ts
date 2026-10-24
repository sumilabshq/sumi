import { flatTabIdsOf } from "../../../shared/lib/host-tabs/host-tabs.js";
import type { HostTab, HostTabsMoment, TabGroup } from "../../../shared/lib/host-tabs/host-tabs.js";
import { WORKSPACE_LIST, findGroup } from "../../../shared/lib/host-tabs/tab-lists.js";
import { hostOf, tabArtOf } from "../../../shared/lib/tab-art/tab-art-of.js";
import { shownTabIdOf } from "../../../shared/lib/tab-showing/show-tab.js";
import { pagesOfTabs } from "../../../shared/lib/tab-showing/tab-pages.js";
import type {
	AppKind,
	AppTab,
	AppTabState,
	EssentialTile,
	ListTarget,
	SidebarEntry,
	TabSection,
	TabStatus,
	TabsSidebar,
} from "../../../shared/schema/app-tab.schema.js";
import type { Essential } from "../../../shared/schema/essential.schema.js";
import type { PageFacts } from "../../../shared/schema/page-facts.schema.js";
import type { ListEntry } from "../../../shared/schema/tab-group.schema.js";

const APP_LABELS: Readonly<Record<AppKind, string>> = {
	canvas: "Canvas",
	browser: "Browser",
};

const NEW_PAGE = "New tab";

export interface SidebarAsk {
	readonly moment: HostTabsMoment;
	readonly essentials: readonly Essential[];
	readonly pages: readonly PageFacts[];
	readonly shownApp: AppKind | null;
	readonly chat: TabsSidebar["chat"];
	readonly shutLists: readonly string[];
	readonly inPanes: readonly string[];
}

export function tabRowsOf(
	moment: HostTabsMoment,
	pages: readonly PageFacts[],
	shownApp: AppKind | null,
	listIds: readonly string[],
): readonly AppTabState[] {
	const rows = new TabRows(moment, pages, shownIdsOf(moment, shownApp, []));
	return listIds.flatMap((listId) => flatTabIdsOf(moment, listId).flatMap((id) => rows.rowsOf(id)));
}

const WORKSPACE_FACE: ListTarget = {
	list: WORKSPACE_LIST,
	owner: "workspace",
	title: WORKSPACE_LIST,
};

export function sidebarOf(ask: SidebarAsk): TabsSidebar {
	const rows = new TabRows(ask.moment, ask.pages, shownIdsOf(ask.moment, ask.shownApp, ask.inPanes));
	const listTargets = [WORKSPACE_FACE, chatFaceOf(ask.chat)] as const;
	return {
		chat: ask.chat,
		essentials: ask.essentials.map((essential) => rows.tileOf(essential)),
		sections: sectionsOf(rows, listTargets, ask.shutLists),
		listTargets,
	};
}

function chatFaceOf(chat: SidebarAsk["chat"]): ListTarget {
	return {
		list: chat.id,
		owner: "chat",
		title: chat.title,
	};
}

function sectionsOf(
	rows: TabRows,
	[workspaceFace, chatFace]: readonly [ListTarget, ListTarget],
	shutLists: readonly string[],
): readonly TabSection[] {
	const workspace = sectionOf(rows, workspaceFace, shutLists);
	const filledSections = [workspace, sectionOf(rows, chatFace, shutLists)].filter(
		(section) => section.entries.length > 0,
	);
	return filledSections.length === 0 ? [workspace] : filledSections;
}

function sectionOf(rows: TabRows, face: ListTarget, shutLists: readonly string[]): TabSection {
	return {
		...face,
		isOpen: !shutLists.includes(face.list),
		count: rows.countOf(face.list),
		entries: rows.listEntriesOf(face.list),
	};
}

function shownIdsOf(moment: HostTabsMoment, shownApp: AppKind | null, inPanes: readonly string[]): ReadonlySet<string> {
	const shownId = shownTabIdOf(moment, shownApp);
	return new Set(shownId === null ? inPanes : [shownId, ...inPanes]);
}

class TabRows {
	private readonly pageOf: ReadonlyMap<string, PageFacts>;
	private readonly tabOf: ReadonlyMap<string, HostTab>;

	constructor(
		private readonly moment: HostTabsMoment,
		pages: readonly PageFacts[],
		private readonly shownIds: ReadonlySet<string>,
	) {
		this.pageOf = pagesOfTabs(moment.tabs, pages);
		this.tabOf = new Map(moment.tabs.map((tab) => [tab.id, tab]));
	}

	rowsOf(id: string): AppTabState[] {
		const tab = this.tabOf.get(id);

		if (tab === undefined) {
			return [];
		}

		return [
			{
				...faceOf(tab, this.pageOf.get(tab.id) ?? null),
				isShown: this.shownIds.has(tab.id),
			},
		];
	}

	listEntriesOf(list: string): readonly SidebarEntry[] {
		return (this.moment.lists[list] ?? []).flatMap((entry) => this.entriesOf(entry));
	}

	countOf(list: string): number {
		return flatTabIdsOf(this.moment, list).length;
	}

	entriesOf(entry: ListEntry): SidebarEntry[] {
		if (entry.kind === "tab") {
			return this.rowsOf(entry.id).map((tab) => ({
				kind: "tab",
				tab,
			}));
		}

		const group = findGroup(this.moment.groups, entry.id);
		return group === undefined ? [] : [this.groupEntryOf(group)];
	}

	tileOf(essential: Essential): EssentialTile {
		const live = this.moment.tabs.find((tab) => tab.essentialId === essential.id);

		if (live === undefined) {
			return restingTileOf(essential);
		}

		const page = this.pageOf.get(live.id) ?? null;
		return {
			id: essential.id,
			title: live.label ?? essential.title,
			icon: tabArtOf(essential.app, page?.url || essential.address),
			favicon: page?.favicon ?? essential.favicon,
			isShown: this.shownIds.has(live.id),
			isLive: true,
		};
	}

	private groupEntryOf(group: TabGroup): SidebarEntry {
		return {
			kind: "group",
			group: {
				id: group.id,
				name: group.name,
				hue: group.hue,
				isOpen: group.isOpen,
				tabs: group.tabIds.flatMap((id) => this.rowsOf(id)),
			},
		};
	}
}

function restingTileOf(essential: Essential): EssentialTile {
	return {
		id: essential.id,
		title: essential.title,
		icon: tabArtOf(essential.app, essential.address),
		favicon: essential.favicon,
		isShown: false,
		isLive: false,
	};
}

function faceOf(tab: HostTab, page: PageFacts | null): AppTab {
	return page === null ? idleFaceOf(tab) : pageFaceOf(tab, page);
}

function idleFaceOf(tab: HostTab): AppTab {
	return {
		id: tab.id,
		app: tab.app,
		title: tab.label ?? APP_LABELS[tab.app],
		subtitle: null,
		icon: tabArtOf(tab.app, null),
		favicon: null,
		status: null,
		label: tab.label,
		address: null,
		isInOwnWindow: false,
	};
}

function pageFaceOf(tab: HostTab, page: PageFacts): AppTab {
	const address = page.url || null;
	return {
		id: tab.id,
		app: tab.app,
		title: tab.label ?? (page.title || NEW_PAGE),
		subtitle: hostOf(page.url),
		icon: tabArtOf(tab.app, address),
		favicon: page.favicon ?? null,
		status: statusOf(page),
		label: tab.label,
		address,
		isInOwnWindow: page.isInOwnWindow,
	};
}

function statusOf({ isInkReading, isAskWaiting, isClosedToInk }: PageFacts): TabStatus | null {
	if (isInkReading) {
		return "reading";
	}

	if (isAskWaiting) {
		return "waiting";
	}

	return isClosedToInk ? "cannot-look" : null;
}
