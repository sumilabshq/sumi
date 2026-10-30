import { APP_LABELS } from "./app-labels.js";
import { flatTabIdsOf, isPageTab } from "../tabs/host-tabs.js";
import type { HostTab, HostTabsMoment, PageTab } from "../tabs/host-tabs.js";
import { hostOf, tabArtOf } from "./tab-art-of.js";
import { shownTabIdOf } from "../showing/showing.js";
import { pagesOfTabs } from "../showing/tab-pages.js";
import type { AppTab, AppTabState, Essential, EssentialTile, TabStatus } from "../../schema/tab-rows.schema.js";
import type { PageFacts } from "../../schema/screen.schema.js";
import type { PageApp } from "../../schema/tabs.schema.js";

const NEW_PAGE = "New tab";

export interface RowLooks {
	readonly shownIds: ReadonlySet<string>;
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
		elsewhereIds: new Set(),
	});
	return listIds.flatMap((listId) => flatTabIdsOf(moment, listId).flatMap((id) => rows.rowsOf(id)));
}

export function shownIdsOf(
	moment: HostTabsMoment,
	shownApp: PageApp | null,
	inPanes: readonly string[],
): ReadonlySet<string> {
	const shownId = shownTabIdOf(moment, shownApp);
	return new Set(shownId === null ? inPanes : [shownId, ...inPanes]);
}

export class TabRows {
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
		return [
			{
				...paged,
				isInOwnWindow: paged.isInOwnWindow || this.looks.elsewhereIds.has(tab.id),
				isShown: this.looks.shownIds.has(tab.id),
			},
		];
	}

	tileOf(essential: Essential): EssentialTile {
		const live = this.moment.tabs.find((tab) => tab.essentialId === essential.id);

		return live === undefined ? restingTileOf(essential) : this.liveTileOf(essential, live);
	}

	private liveTileOf(essential: Essential, live: HostTab): EssentialTile {
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
