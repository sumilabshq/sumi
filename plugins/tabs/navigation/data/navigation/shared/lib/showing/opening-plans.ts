import type { DuplicateTabAsk, OpenTabAsk } from "../../schema/tab-asks.schema.js";
import type { PageApp } from "../../schema/tabs.schema.js";
import { isRefusal, plannedWith, refusal } from "../settling/settling.js";
import type { ExtraPlan, Planned, Refusal, ShowingPlan } from "../settling/settling.js";
import { freshTabOf } from "./new-tab-page.js";
import { withOpenedTabShown } from "./opening.js";
import { withClosedReopened } from "./reopening.js";
import { withMoved, withTabPageOpened } from "./showing.js";
import { withShownTab } from "./tab-shown.js";
import type { Showing } from "./showing.js";
import type { TabFacts } from "./tab-facts.js";
import { tabPageOf } from "./tab-pages.js";
import { chatIdOf, heldTabOf, newTabPlaceOf, openTab, openTabAfter, openTabUnshown } from "../tabs/host-tabs.js";
import type { HostTab, HostTabsMoment, OpenedHostTab, TabPlace } from "../tabs/host-tabs.js";
import { chatOfGroup, placeAfterOf } from "../tabs/tab-lists.js";
import { isPageApp, navigatingAppOf, resolvedAppOf } from "../tabs/app-abilities.js";
import { isPageList, isPlaceableList } from "../tabs/sub-pages.js";

const NOT_HELD = 'the host holds no tab "{id}"';
const NOT_LISTED = 'the tab "{id}" stands in no list';
const NOT_A_PAGE_APP = "a tab of {app} cannot be opened: {app} draws no page in a tab";
const NO_NEW_TAB_APP = "no app declares that it navigates, so a new tab has nothing to open";
const NO_LIST = 'a new tab cannot go to "{list}": no such tab list here';
const NO_GROUP = 'no group "{id}"';
const GROUP_ELSEWHERE = 'the group "{id}" stands in "{home}", not in "{list}"';
const NOTHING_CLOSED = "no closed tab is left to reopen";
const NOT_CLOSED = 'the tab "{id}" is not among the closed tabs';

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
		const app = resolvedAppOf(showing.moment.apps, ask.app, ask.address);

		if (!isPageApp(showing.moment.apps, app)) {
			return refusal(NOT_A_PAGE_APP.replaceAll("{app}", app));
		}

		const held = ask.reusesHeld ? heldAtAddressOf(showing.moment, { app, address: ask.address }) : undefined;

		if (held !== undefined) {
			return plannedWith(ask.show ? withShownTab(showing, facts, { tab: held, paneId: null }) : showing, held.id);
		}

		const place = askedPlaceOf(showing.moment, ask);
		return isRefusal(place) ? place : openedShowing(showing, facts, { ...ask, app, place });
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

		const address =
			chatIdOf(showing.moment.apps, source) ?? tabPageOf(showing.moment, facts.pages, ask.id)?.address ?? "";
		const opened = openedShowing(showing, facts, { app: source.app, place, address, show: ask.show });
		return plannedWith(withTitleOf(opened.showing, opened.extra, source), opened.extra);
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

export function withAddressKept(opened: OpenedHostTab, address: string): OpenedHostTab {
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

function duplicatedTabOf(moment: HostTabsMoment, id: string): HostTab | Refusal {
	return heldTabOf(moment, id) ?? refusal(NOT_HELD.replace("{id}", id));
}

function withTitleOf(showing: Showing, id: string, source: HostTab): Showing {
	if (source.title === null) {
		return showing;
	}

	return {
		...showing,
		moment: {
			...showing.moment,
			tabs: showing.moment.tabs.map((tab) => (tab.id === id ? { ...tab, title: source.title } : tab)),
		},
	};
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

function heldAtAddressOf(
	moment: HostTabsMoment,
	{ app, address }: { readonly app: string; readonly address: string },
): HostTab | undefined {
	return moment.tabs.find((tab) => tab.app === app && (tab.lastAddress ?? "") === address);
}

function askedPlaceOf(moment: HostTabsMoment, { list, groupId }: AskedPlace): TabPlace | Refusal {
	if (groupId !== null) {
		return groupPlaceOf(moment, groupId, list);
	}

	if (list !== null && !isPlaceableList(moment, list)) {
		return refusal(NO_LIST.replace("{list}", list));
	}

	return list !== null && isPageList(moment, list)
		? { chatId: list, groupId: null, before: null }
		: newTabPlaceOf(list);
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
