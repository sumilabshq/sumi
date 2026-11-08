import type {
	DuplicateTabAsk,
	EssentialRef,
	OpenTabAsk,
	TabPlaceAsked,
} from "../../../shared/schema/tab-asks.schema.js";
import type { PageApp } from "../../../shared/schema/tabs.schema.js";
import { isRefusal, plannedWith, refusal } from "../../../shared/lib/settling/settling.js";
import type { ExtraPlan, Planned, Refusal, ShowingPlan } from "../../../shared/lib/settling/settling.js";
import { freshTabOf } from "../../../shared/lib/showing/new-tab-page.js";
import { liveTabOf, withOpenedTabShown } from "../../../shared/lib/showing/opening.js";
import { withClosedReopened } from "../../../shared/lib/showing/reopening.js";
import { withEffect, withMoved, withTabPageOpened, withTabShown } from "../../../shared/lib/showing/showing.js";
import type { Showing } from "../../../shared/lib/showing/showing.js";
import type { TabFacts } from "../../../shared/lib/showing/tab-facts.js";
import { tabPageOf } from "../../../shared/lib/showing/tab-pages.js";
import {
	heldTabOf,
	isKnownList,
	isPageTab,
	newTabPlaceOf,
	openEssentialTab,
	openTab,
	openTabAfter,
	openTabUnshown,
	placeTab,
} from "../../../shared/lib/tabs/host-tabs.js";
import type { HostTabsMoment, OpenedHostTab, PageTab, TabPlace } from "../../../shared/lib/tabs/host-tabs.js";
import { chatOfGroup, placeAfterOf } from "../../../shared/lib/tabs/tab-lists.js";
import { isPageApp, navigatingAppOf } from "../../../shared/lib/tabs/app-abilities.js";
import type { HostTab } from "../../../shared/lib/tabs/host-tabs.js";

const NOT_HELD = 'the host holds no tab "{id}"';
const NOT_LISTED = 'the tab "{id}" stands in no list';
const NOT_A_PAGE_APP = "a tab of {app} cannot be opened: {app} draws no page in a tab";
const NO_NEW_TAB_APP = "no app declares that it navigates, so a new tab has nothing to open";
const NO_LIST = 'a new tab cannot go to "{list}": no such tab list here';
const NO_GROUP = 'no group "{id}"';
const GROUP_ELSEWHERE = 'the group "{id}" stands in "{home}", not in "{list}"';
const NOTHING_CLOSED = "no closed tab is left to reopen";
const NOT_CLOSED = 'the tab "{id}" is not among the closed tabs';
const NOT_A_PAGE = 'the tab "{id}" is a chat: it cannot be duplicated';
const RECORD_GONE = 'the essential "{id}" names a {app} that is neither open nor closed here';

interface AskedPlace {
	readonly list: string | null;
	readonly groupId: string | null;
}

interface TabToOpen {
	readonly app: PageApp;
	readonly place: TabPlace;
	readonly address: string;
	readonly show: boolean;
}

export function openPlan(ask: Omit<OpenTabAsk, "at">): ExtraPlan<string> {
	return (showing, facts) => {
		if (!isPageApp(showing.moment.apps, ask.app)) {
			return refusal(NOT_A_PAGE_APP.replaceAll("{app}", ask.app));
		}

		const held = ask.reusesHeld ? heldAtAddressOf(showing.moment, ask) : undefined;

		if (held !== undefined) {
			return plannedWith(ask.show ? withTabShown(showing, facts, held) : showing, held.id);
		}

		const place = askedPlaceOf(showing.moment, ask);
		return isRefusal(place) ? place : openedShowing(showing, facts, { ...ask, place });
	};
}

export function openBelowPlan(id: string): ExtraPlan<string> {
	return (showing, facts) => {
		if (!heldTabOf(showing.moment, id)) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		const app = navigatingAppOf(showing.moment.apps);

		if (app === null) {
			return refusal(NO_NEW_TAB_APP);
		}

		const opened = openTabAfter(showing.moment, id, freshTabOf(showing.moment.apps, app, facts.isBrowserAvailable));

		if (opened === null) {
			return refusal(NOT_LISTED.replace("{id}", id));
		}

		return plannedWith(withOpenedTabShown(withMoved(showing, opened), facts, opened.tab, ""), opened.tab.id);
	};
}

export function duplicatePlan(ask: Omit<DuplicateTabAsk, "at">): ExtraPlan<string> {
	return (showing, facts) => {
		const source = duplicatedTabOf(showing.moment, ask.id);

		if (isRefusal(source)) {
			return source;
		}

		const place = duplicatePlaceOf(showing.moment, ask);

		if (isRefusal(place)) {
			return place;
		}

		const address = tabPageOf(showing.moment, facts.pages, ask.id)?.address ?? "";
		return openedShowing(showing, facts, { app: source.app, place, address, show: ask.show });
	};
}

export function reopenPlan(tabId: string | null): ShowingPlan {
	return (showing, facts) => {
		const asked = tabId ?? showing.moment.closed.at(-1)?.tab.id ?? null;
		const reopened = asked === null ? null : withClosedReopened(showing, facts, asked);

		if (reopened !== null) {
			return reopened;
		}

		return refusal(tabId === null ? NOTHING_CLOSED : NOT_CLOSED.replace("{id}", tabId));
	};
}

export function showEssentialPlan(essential: EssentialRef): ShowingPlan {
	return (showing, facts) => {
		const live = liveTabOf(showing.moment, essential.id);

		if (live) {
			return withEssentialShown(showing, facts, live);
		}

		const closed = showing.moment.closed.find(({ tab }) => tab.essentialId === essential.id);

		if (closed === undefined) {
			return withEssentialOpened(showing, facts, essential);
		}

		return withClosedReopened(showing, facts, closed.tab.id) ?? refusal(NOT_CLOSED.replace("{id}", closed.tab.id));
	};
}

export function releaseEssentialPlan(essential: EssentialRef, asked: TabPlaceAsked): ShowingPlan {
	return (showing, facts) => {
		const place = { chatId: asked.list, groupId: asked.groupId, before: asked.before };
		const live = liveTabOf(showing.moment, essential.id);

		if (live) {
			return withMoved(showing, placeTab(showing.moment, live.id, place));
		}

		if (!isPageApp(showing.moment.apps, essential.app)) {
			return recordGoneOf(essential);
		}

		const opened = openTab(
			showing.moment,
			freshTabOf(showing.moment.apps, essential.app, facts.isBrowserAvailable),
			place,
		);
		return withOpenedTabShown(withMoved(showing, opened), facts, opened.tab, essential.address ?? "");
	};
}

function duplicatedTabOf(moment: HostTabsMoment, id: string): PageTab | Refusal {
	const source = heldTabOf(moment, id);

	if (!source) {
		return refusal(NOT_HELD.replace("{id}", id));
	}

	return isPageTab(moment.apps, source) ? source : refusal(NOT_A_PAGE.replace("{id}", id));
}

function openedShowing(showing: Showing, facts: TabFacts, asked: TabToOpen): Planned<string> {
	const fresh = freshTabOf(showing.moment.apps, asked.app, facts.isBrowserAvailable);
	const opened = withAddressKept(
		asked.show ? openTab(showing.moment, fresh, asked.place) : openTabUnshown(showing.moment, fresh, asked.place),
		asked.address,
	);
	const moved = withMoved(showing, opened);
	const shown = asked.show
		? withOpenedTabShown(moved, facts, opened.tab, asked.address)
		: withTabPageOpened(moved, opened.tab, { address: asked.address, isShown: false });
	return plannedWith(shown, opened.tab.id);
}

function heldAtAddressOf(moment: HostTabsMoment, { app, address }: Omit<OpenTabAsk, "at">): HostTab | undefined {
	return moment.tabs.find((tab) => tab.app === app && (tab.lastAddress ?? "") === address);
}

function askedPlaceOf(moment: HostTabsMoment, { list, groupId }: AskedPlace): TabPlace | Refusal {
	if (groupId !== null) {
		return groupPlaceOf(moment, groupId, list);
	}

	if (list !== null && !isKnownList(moment, list)) {
		return refusal(NO_LIST.replace("{list}", list));
	}

	return newTabPlaceOf(moment, list);
}

function duplicatePlaceOf(moment: HostTabsMoment, asked: AskedPlace & { readonly id: string }): TabPlace | Refusal {
	if (asked.list !== null || asked.groupId !== null) {
		return askedPlaceOf(moment, asked);
	}

	return placeAfterOf(moment, asked.id) ?? refusal(NOT_LISTED.replace("{id}", asked.id));
}

function groupPlaceOf(moment: HostTabsMoment, groupId: string, list: string | null): TabPlace | Refusal {
	const home = chatOfGroup(moment, groupId);

	if (home === null) {
		return refusal(NO_GROUP.replace("{id}", groupId));
	}

	if (list !== null && list !== home) {
		return refusal(GROUP_ELSEWHERE.replace("{id}", groupId).replace("{home}", home).replace("{list}", list));
	}

	return {
		chatId: home,
		groupId,
		before: null,
	};
}

function withEssentialShown(showing: Showing, facts: TabFacts, live: HostTab): Showing {
	if (isPageApp(showing.moment.apps, live.app)) {
		return withTabShown(showing, facts, live);
	}

	return withEffect(showing, { kind: "show-chat", chatId: live.id, paneId: null });
}

function withEssentialOpened(showing: Showing, facts: TabFacts, essential: EssentialRef): Showing | Refusal {
	if (!isPageApp(showing.moment.apps, essential.app)) {
		return recordGoneOf(essential);
	}

	const opened = openEssentialTab(
		showing.moment,
		essential.id,
		freshTabOf(showing.moment.apps, essential.app, facts.isBrowserAvailable),
	);
	return withOpenedTabShown(withMoved(showing, opened), facts, opened.tab, essential.address ?? "");
}

function recordGoneOf(essential: EssentialRef): Refusal {
	return refusal(RECORD_GONE.replace("{id}", essential.id).replace("{app}", essential.app));
}

function withAddressKept(opened: OpenedHostTab, address: string): OpenedHostTab {
	if (opened.tab.pageId !== null || address === "") {
		return opened;
	}

	const tab: HostTab = {
		...opened.tab,
		lastAddress: address,
	};
	return {
		tab,
		moment: {
			...opened.moment,
			tabs: opened.moment.tabs.map((held) => (held.id === tab.id ? tab : held)),
		},
		reason: `${opened.reason} at ${address}`,
	};
}
