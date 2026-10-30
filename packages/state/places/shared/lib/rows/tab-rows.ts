import { APP_LABELS } from "./app-labels.js";
import { flatTabIdsOf, isPageTab, newTabPlaceOf } from "../tabs/host-tabs.js";
import type { HostTabsMoment, PageTab, TabGroup } from "../tabs/host-tabs.js";
import { WORKSPACE_LIST, findGroup } from "../tabs/tab-lists.js";
import { hostOf, tabArtOf } from "./tab-art-of.js";
import { shownTabIdOf } from "../showing/showing.js";
import { pagesOfTabs } from "../showing/tab-pages.js";
import type {
	AppTab,
	AppTabState,
	Essential,
	EssentialTile,
	ListTarget,
	PlacedSidebar,
	SidebarEntry,
	TabSection,
	TabStatus,
} from "../../schema/tab-rows.schema.js";
import type { PageFacts } from "../../schema/screen.schema.js";
import type { ListEntry, PageApp } from "../../schema/tabs.schema.js";

const NEW_PAGE = "New tab";
const THIS_WORKSPACE = "This workspace";

export interface BoardChat {
	readonly id: string;
	readonly title: string;
}

export interface SidebarLook {
	readonly hidesEmptyLists: boolean;
	readonly hidesOwnWindowTabs: boolean;
}

export interface SidebarRowsAsk {
	readonly moment: HostTabsMoment;
	readonly essentials: readonly Essential[];
	readonly pages: readonly PageFacts[];
	readonly shownApp: PageApp | null;
	readonly boardChats: readonly BoardChat[];
	readonly shutLists: readonly string[];
	readonly view: SidebarLook;
	readonly inPanes: readonly string[];
	readonly hasShownTabPane: boolean;
	readonly elsewhere: readonly string[];
}

interface RowLooks {
	readonly shownIds: ReadonlySet<string>;
	readonly hidesOwnWindowTabs: boolean;
	readonly elsewhereIds: ReadonlySet<string>;
}

export function tabRowsOf(
	moment: HostTabsMoment,
	pages: readonly PageFacts[],
	shownApp: PageApp | null,
	listIds: readonly string[],
): readonly AppTabState[] {
	const rows = new TabRows(moment, pages, {
		shownIds: shownIdsOf(moment, shownApp, []),
		hidesOwnWindowTabs: false,
		elsewhereIds: new Set(),
	});
	return listIds.flatMap((listId) => flatTabIdsOf(moment, listId).flatMap((id) => rows.rowsOf(id)));
}

const WORKSPACE_FACE: ListTarget = {
	list: WORKSPACE_LIST,
	owner: "workspace",
	title: THIS_WORKSPACE,
};

export function sidebarOf(ask: SidebarRowsAsk): PlacedSidebar {
	const shownIds = shownIdsOf(ask.moment, ask.hasShownTabPane ? ask.shownApp : null, ask.inPanes);
	const rows = new TabRows(ask.moment, ask.pages, {
		shownIds,
		hidesOwnWindowTabs: ask.view.hidesOwnWindowTabs,
		elsewhereIds: new Set(ask.elsewhere),
	});
	const chatFaces = ask.boardChats.map(chatFaceOf);
	const listTargets = [WORKSPACE_FACE, ...chatFaces];
	return {
		essentials: ask.essentials.map((essential) => rows.tileOf(essential)),
		sections: sectionsOf(rows, chatFaces, ask),
		listTargets,
		workspaceList: WORKSPACE_LIST,
		newTabList: newTabPlaceOf(ask.moment, null).chatId,
		view: ask.view,
	};
}

function chatFaceOf(chat: BoardChat): ListTarget {
	return {
		list: chat.id,
		owner: "chat",
		title: chat.title,
	};
}

function sectionsOf(
	rows: TabRows,
	chatFaces: readonly ListTarget[],
	{ shutLists, view }: SidebarRowsAsk,
): readonly TabSection[] {
	const chats = chatFaces
		.map((face) => sectionOf(rows, face, shutLists))
		.filter((chat) => !view.hidesEmptyLists || chat.count > 0);
	return [sectionOf(rows, WORKSPACE_FACE, shutLists), ...chats];
}

function sectionOf(rows: TabRows, face: ListTarget, shutLists: readonly string[]): TabSection {
	return {
		...face,
		isOpen: !shutLists.includes(face.list),
		count: rows.countOf(face.list),
		entries: rows.listEntriesOf(face.list),
	};
}

function shownIdsOf(moment: HostTabsMoment, shownApp: PageApp | null, inPanes: readonly string[]): ReadonlySet<string> {
	const shownId = shownTabIdOf(moment, shownApp);
	return new Set(shownId === null ? inPanes : [shownId, ...inPanes]);
}

class TabRows {
	private readonly pageOf: ReadonlyMap<string, PageFacts>;
	private readonly tabOf: ReadonlyMap<string, PageTab>;

	constructor(
		private readonly moment: HostTabsMoment,
		pages: readonly PageFacts[],
		private readonly looks: RowLooks,
	) {
		this.pageOf = pagesOfTabs(moment.tabs, pages);
		this.tabOf = new Map(moment.tabs.filter(isPageTab).map((tab) => [tab.id, tab]));
	}

	rowsOf(id: string): AppTabState[] {
		const tab = this.tabOf.get(id);

		if (tab === undefined) {
			return [];
		}

		const paged = faceOf(tab, this.pageOf.get(tab.id) ?? null);
		const face = { ...paged, isInOwnWindow: paged.isInOwnWindow || this.looks.elsewhereIds.has(tab.id) };

		if (this.looks.hidesOwnWindowTabs && face.isInOwnWindow) {
			return [];
		}

		return [
			{
				...face,
				isShown: this.looks.shownIds.has(tab.id),
			},
		];
	}

	listEntriesOf(list: string): readonly SidebarEntry[] {
		return (this.moment.lists[list] ?? []).flatMap((entry) => this.entriesOf(entry));
	}

	countOf(list: string): number {
		return flatTabIdsOf(this.moment, list).flatMap((id) => this.rowsOf(id)).length;
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
			isShown: this.looks.shownIds.has(live.id),
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

function faceOf(tab: PageTab, page: PageFacts | null): AppTab {
	return page === null ? idleFaceOf(tab) : pageFaceOf(tab, page);
}

function idleFaceOf(tab: PageTab): AppTab {
	return {
		id: tab.id,
		app: tab.app,
		title: tab.label ?? tab.lastTitle ?? unloadedTitleOf(tab),
		subtitle: tab.lastAddress === null ? null : hostOf(tab.lastAddress),
		icon: tabArtOf(tab.app, tab.lastAddress),
		favicon: tab.lastFavicon,
		status: null,
		label: tab.label,
		address: tab.lastAddress,
		isInOwnWindow: false,
	};
}

function unloadedTitleOf({ app, lastAddress }: PageTab): string {
	const site = lastAddress === null ? null : hostOf(lastAddress);

	if (site !== null) {
		return site;
	}

	return app === "browser" ? NEW_PAGE : APP_LABELS[app];
}

function pageFaceOf(tab: PageTab, page: PageFacts): AppTab {
	const address = page.url || tab.lastAddress;
	return {
		id: tab.id,
		app: tab.app,
		title: tab.label ?? (page.title || tab.lastTitle || NEW_PAGE),
		subtitle: address === null ? null : hostOf(address),
		icon: tabArtOf(tab.app, address),
		favicon: page.favicon ?? tab.lastFavicon,
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
