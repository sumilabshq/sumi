import { flatTabIdsOf, isPageTab } from "../tabs/host-tabs.js";
import type { HostTab, HostTabsMoment, PageTab } from "../tabs/host-tabs.js";
import { hostOf, tabArtOf, titleOf, titleOfTab } from "./tab-face.js";
import { chatHomeOf } from "../showing/chat-home.js";
import { shownAppOf, shownTabIdOf } from "../showing/showing.js";
import { tabIdsInPanesOf } from "../showing/tab-facts.js";
import type { TabFacts } from "../showing/tab-facts.js";
import { pagesOfTabs } from "../showing/tab-pages.js";
import type { AppTab, AppTabState, Essential, EssentialTile, TabStatus } from "../../schema/tab-rows.schema.js";
import type { PageFacts } from "../../schema/screen.schema.js";
import { canStandInHolders, isTearable } from "../tabs/app-abilities.js";
import type { PlacedApps } from "../tabs/app-abilities.js";

export interface RowLooks {
	readonly highlightedIds: ReadonlySet<string>;
	readonly elsewhereIds: ReadonlySet<string>;
}

export function tabRowsOf(
	moment: HostTabsMoment,
	pages: readonly PageFacts[],
	listIds: readonly string[],
): readonly AppTabState[] {
	const rows = new TabRows(moment, pages, {
		highlightedIds: shownIdsOf(moment),
		elsewhereIds: new Set(),
	});
	const pageIds = new Set(moment.tabs.filter((tab) => isPageTab(moment.apps, tab)).map((tab) => tab.id));
	const listed = listIds.flatMap((listId) => flatTabIdsOf(moment, listId));
	return listed.filter((id) => pageIds.has(id)).flatMap((id) => rows.rowsOf(id));
}

export function shownIdsOf(moment: HostTabsMoment): ReadonlySet<string> {
	const shownId = shownTabIdOf(moment, shownAppOf(moment.view));
	return new Set(shownId === null ? [] : [shownId]);
}

export function selectedIdsOf(moment: HostTabsMoment, facts: TabFacts): ReadonlySet<string> {
	const { selectedId } = moment;

	if (selectedId === null || facts.tabWindows.has(selectedId) || !isTabOnScreen(moment, facts, selectedId)) {
		return new Set();
	}

	const holderId = chatHomeOf(moment, selectedId);
	return new Set(holderId === null ? [selectedId] : [selectedId, holderId]);
}

export class TabRows {
	private readonly pageOf: ReadonlyMap<string, PageFacts>;
	private readonly tabOf: ReadonlyMap<string, HostTab>;

	constructor(
		private readonly moment: HostTabsMoment,
		pages: readonly PageFacts[],
		private readonly looks: RowLooks,
	) {
		this.pageOf = pagesOfTabs(moment.tabs, pages);
		this.tabOf = new Map(moment.tabs.map((tab) => [tab.id, tab]));
	}

	rowsOf(id: string): AppTabState[] {
		const tab = this.tabOf.get(id);

		if (tab === undefined) {
			return [];
		}

		const paged = isPageTab(this.moment.apps, tab)
			? faceOf(this.moment.apps, tab, this.pageOf.get(tab.id) ?? null)
			: recordFaceOf(this.moment.apps, tab);
		return [
			{
				...paged,
				isInOwnWindow: paged.isInOwnWindow || this.looks.elsewhereIds.has(tab.id),
				isShown: this.looks.highlightedIds.has(tab.id),
				isNestable: canStandInHolders(this.moment.apps, tab),
				isTearable: isTearable(this.moment.apps, tab),
			},
		];
	}

	tileOf(essential: Essential): EssentialTile {
		const live = this.moment.tabs.find((tab) => tab.essentialId === essential.id);

		return live === undefined ? restingTileOf(this.moment.apps, essential) : this.liveTileOf(essential, live);
	}

	private liveTileOf(essential: Essential, live: HostTab): EssentialTile {
		const page = this.pageOf.get(live.id) ?? null;
		return {
			id: essential.id,
			title: titleOf(this.moment.apps, {
				app: essential.app,
				label: live.label,
				title: live.title ?? essential.title,
				address: null,
			}),
			icon: tabArtOf(this.moment.apps, essential.app, page?.url || essential.address),
			favicon: page?.favicon ?? essential.favicon,
			isShown: this.looks.highlightedIds.has(live.id),
			isLive: true,
		};
	}
}
function restingTileOf(apps: PlacedApps, essential: Essential): EssentialTile {
	return {
		id: essential.id,
		title: essential.title,
		icon: tabArtOf(apps, essential.app, essential.address),
		favicon: essential.favicon,
		isShown: false,
		isLive: false,
	};
}

const PAGELESS: Pick<AppTab, "subtitle" | "favicon" | "status" | "address" | "isInOwnWindow"> = {
	subtitle: null,
	favicon: null,
	status: null,
	address: null,
	isInOwnWindow: false,
};

function recordFaceOf(apps: PlacedApps, tab: HostTab): AppTab {
	return {
		...PAGELESS,
		id: tab.id,
		app: tab.app,
		title: titleOfTab(apps, tab),
		icon: tabArtOf(apps, tab.app, null),
		label: tab.label,
		mark: tab.mark,
	};
}

function faceOf(apps: PlacedApps, tab: PageTab, page: PageFacts | null): AppTab {
	return page === null ? idleFaceOf(apps, tab) : pageFaceOf(apps, tab, page);
}

function idleFaceOf(apps: PlacedApps, tab: PageTab): AppTab {
	return {
		id: tab.id,
		app: tab.app,
		title: titleOf(apps, {
			app: tab.app,
			label: tab.label,
			title: null,
			address: tab.lastAddress,
		}),
		subtitle: tab.lastAddress === null ? null : hostOf(tab.lastAddress),
		icon: tabArtOf(apps, tab.app, tab.lastAddress),
		favicon: null,
		status: null,
		label: tab.label,
		address: tab.lastAddress,
		isInOwnWindow: false,
		mark: tab.mark,
	};
}

function pageFaceOf(apps: PlacedApps, tab: PageTab, page: PageFacts): AppTab {
	const address = page.url || tab.lastAddress;
	return {
		id: tab.id,
		app: tab.app,
		title: titleOf(apps, {
			app: tab.app,
			label: tab.label,
			title: page.title || null,
			address: null,
		}),
		subtitle: address === null ? null : hostOf(address),
		icon: tabArtOf(apps, tab.app, address),
		favicon: page.favicon,
		status: statusOf(page),
		label: tab.label,
		address,
		isInOwnWindow: page.isInOwnWindow,
		mark: tab.mark,
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

function isTabOnScreen(moment: HostTabsMoment, facts: TabFacts, id: string): boolean {
	return (
		(facts.shownTabPaneId !== null && shownTabIdOf(moment, shownAppOf(moment.view)) === id) ||
		facts.chatGroupIds.includes(id) ||
		tabIdsInPanesOf(facts).includes(id)
	);
}
