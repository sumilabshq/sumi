import { flatTabIdsOf } from "../../../shared/lib/host-tabs/host-tabs.js";
import type { HostTab, HostTabsMoment, TabGroup } from "../../../shared/lib/host-tabs/host-tabs.js";
import { findGroup } from "../../../shared/lib/host-tabs/tab-lists.js";
import { hostOf, tabArtOf } from "../../../shared/lib/tab-art/tab-art-of.js";
import { shownTabIdOf } from "../../../shared/lib/tab-showing/show-tab.js";
import { pagesOfTabs } from "../../../shared/lib/tab-showing/tab-pages.js";
import type {
	AppKind,
	AppTab,
	AppTabState,
	EssentialTile,
	SidebarEntry,
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
	readonly isListOpen: boolean;
}

export function chatTabRowsOf(
	moment: HostTabsMoment,
	pages: readonly PageFacts[],
	shownApp: AppKind | null,
	chatId: string,
): readonly AppTabState[] {
	const rows = new TabRows(moment, pages, shownApp);
	return flatTabIdsOf(moment, chatId).flatMap((id) => rows.rowsOf(id));
}

export function sidebarOf({ moment, essentials, pages, shownApp, chat, isListOpen }: SidebarAsk): TabsSidebar {
	const rows = new TabRows(moment, pages, shownApp);
	return {
		chat,
		essentials: essentials.map((essential) => rows.tileOf(essential)),
		entries: (moment.lists[chat.id] ?? []).flatMap((entry) => rows.entriesOf(entry)),
		isListOpen,
	};
}

class TabRows {
	private readonly shownId: string | null;
	private readonly pageOf: ReadonlyMap<string, PageFacts>;
	private readonly tabOf: ReadonlyMap<string, HostTab>;

	constructor(
		private readonly moment: HostTabsMoment,
		pages: readonly PageFacts[],
		shownApp: AppKind | null,
	) {
		this.shownId = shownTabIdOf(moment, shownApp);
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
				isShown: tab.id === this.shownId,
			},
		];
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
			isShown: live.id === this.shownId,
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
