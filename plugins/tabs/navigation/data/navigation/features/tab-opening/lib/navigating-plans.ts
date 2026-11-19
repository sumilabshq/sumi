import type { NavigateAsk, NavigationTarget } from "../../../shared/schema/tab-asks.schema.js";
import { isRefusal, plannedWith, refusal } from "../../../shared/lib/settling/settling.js";
import type { ExtraPlan, Planned, Refusal } from "../../../shared/lib/settling/settling.js";
import { withTabsGone } from "../../../shared/lib/showing/closing.js";
import { freshTabOf } from "../../../shared/lib/showing/new-tab-page.js";
import { withOpenedTabShown } from "../../../shared/lib/showing/opening.js";
import { shownTabIdOf, withEffect, withMoved, withView } from "../../../shared/lib/showing/showing.js";
import { tabPageOf } from "../../../shared/lib/showing/tab-pages.js";
import type { Showing } from "../../../shared/lib/showing/showing.js";
import type { TabFacts } from "../../../shared/lib/showing/tab-facts.js";
import { withShownTab } from "../../../shared/lib/showing/tab-shown.js";
import { swappedInSplit } from "../../../shared/lib/splits/split-moves.js";
import { splitOfTab, standsInSection } from "../../../shared/lib/splits/split-members.js";
import { isPageApp, resolvedAppOf } from "../../../shared/lib/tabs/app-abilities.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import { heldTabOf, isPageTab, markSelected, openTabUnshown, placeTab, tabOf } from "../../../shared/lib/tabs/host-tabs.js";
import type { HostTab, TabPlace } from "../../../shared/lib/tabs/host-tabs.js";
import { locationOf, placeOfLocation } from "../../../shared/lib/tabs/tab-lists.js";
import { openPlan, withAddressKept } from "./opening-plans.js";

type Navigation = Omit<NavigateAsk, "at">;

interface InPlace {
	readonly target: NavigationTarget;
	readonly fromId: string;
}

interface Reached {
	readonly showing: Showing;
	readonly tab: HostTab;
}

interface Reaching {
	readonly target: Extract<NavigationTarget, { kind: "tab" }>;
	readonly place: TabPlace;
}

interface FreshReaching {
	readonly target: Extract<NavigationTarget, { kind: "app" }>;
	readonly place: TabPlace;
}

interface Retargeting {
	readonly from: HostTab;
	readonly app: string;
	readonly address: string;
}

const NOT_HELD = 'the host holds no tab "{id}"';
const NOT_LISTED = 'the tab "{id}" stands in no list';
const NO_FROM = "this-tab needs from: the tab whose place the target takes";
const NOT_A_PAGE_APP = "a tab of {app} cannot be opened: {app} draws no page in a tab";

export function resolvedTargetOf(apps: PlacedApps, target: NavigationTarget): NavigationTarget {
	if (target.kind === "tab") {
		return target;
	}

	return {
		...target,
		app: resolvedAppOf(apps, target.app, target.address),
	};
}

export function navigatePlan({ target, where, from }: Navigation): ExtraPlan<string> {
	return (showing, facts) => {
		if (where === "new-tab") {
			return newTabNavigated(showing, facts, target);
		}

		if (from === null) {
			return refusal(NO_FROM);
		}

		return inPlaceNavigated(showing, facts, {
			target,
			fromId: from,
		});
	};
}

export function withExistingShown(showing: Showing, facts: TabFacts, tab: HostTab): Showing {
	return withShownTab(withMoved(showing, markSelected(showing.moment, tab.id)), facts, {
		tab,
		paneId: null,
	});
}

function newTabNavigated(showing: Showing, facts: TabFacts, target: NavigationTarget): Planned<string> | Refusal {
	if (target.kind === "app") {
		return openPlan({
			app: target.app,
			list: null,
			groupId: null,
			address: target.address,
			show: true,
			reusesHeld: false,
		})(showing, facts);
	}

	const tab = heldTabOf(showing.moment, target.id);

	if (!tab) {
		return refusal(NOT_HELD.replace("{id}", target.id));
	}

	return plannedWith(withExistingShown(showing, facts, tab), tab.id);
}

function inPlaceNavigated(showing: Showing, facts: TabFacts, { target, fromId }: InPlace): Planned<string> | Refusal {
	const from = heldTabOf(showing.moment, fromId);

	if (!from) {
		return refusal(NOT_HELD.replace("{id}", fromId));
	}

	if (target.kind === "app" && isPageTab(showing.moment.apps, from)) {
		return retargeted(showing, facts, { from, app: target.app, address: target.address });
	}

	const location = locationOf(showing.moment, fromId);

	if (location === null) {
		return refusal(NOT_LISTED.replace("{id}", fromId));
	}

	const place = placeOfLocation(showing.moment, location);
	const reached = target.kind === "app" ? freshReachedOf(showing, facts, { target, place }) : reachedTabOf(showing, { target, place });

	if (isRefusal(reached)) {
		return reached;
	}

	if (reached.tab.id === fromId) {
		return plannedWith(withExistingShown(showing, facts, reached.tab), fromId);
	}

	const swapped = standsInSection(reached.showing.moment, reached.tab.id)
		? withMoved(reached.showing, swappedInSplit(reached.showing.moment, { fromId, toId: reached.tab.id }))
		: reached.showing;
	const tab = tabOf(swapped.moment, reached.tab.id);
	const shown =
		target.kind === "app"
			? withOpenedTabShown(swapped, facts, tab, target.address)
			: withExistingShown(swapped, facts, tab);
	const gone = withTabsGone(shown, facts, {
		ids: [fromId],
		reason: `${fromId} gives its place to ${tab.id}`,
	});
	return plannedWith(withViewSettled(gone), tab.id);
}

function freshReachedOf(showing: Showing, facts: TabFacts, { target, place }: FreshReaching): Reached | Refusal {
	if (!isPageApp(showing.moment.apps, target.app)) {
		return refusal(NOT_A_PAGE_APP.replaceAll("{app}", target.app));
	}

	const fresh = freshTabOf(showing.moment.apps, target.app, facts.isBrowserAvailable);
	const opened = withAddressKept(openTabUnshown(showing.moment, fresh, place), target.address);
	return {
		showing: withMoved(showing, opened),
		tab: opened.tab,
	};
}

function retargeted(showing: Showing, facts: TabFacts, { from, app, address }: Retargeting): Planned<string> | Refusal {
	if (!isPageApp(showing.moment.apps, app)) {
		return refusal(NOT_A_PAGE_APP.replaceAll("{app}", app));
	}

	const fresh = freshTabOf(showing.moment.apps, app, facts.isBrowserAvailable);
	const tab: HostTab = {
		...fresh,
		id: from.id,
		label: null,
		lastAddress: fresh.pageId === null && address !== "" ? address : null,
		title: null,
		mark: "none",
	};
	const moved = withMoved(showing, {
		moment: {
			...showing.moment,
			tabs: showing.moment.tabs.map((held) => (held.id === from.id ? tab : held)),
		},
		reason: `${from.id} ${from.app} → ${app} (navigated in place)`,
	});
	const oldPageId = tabPageOf(showing.moment, facts.pages, from.id)?.pageId ?? null;
	const released = oldPageId === null ? moved : withEffect(moved, { kind: "close-page", pageId: oldPageId });
	return plannedWith(withViewSettled(withOpenedTabShown(released, facts, tab, address)), from.id);
}

function reachedTabOf(showing: Showing, { target, place }: Reaching): Reached | Refusal {
	const { moment } = showing;
	const tab = heldTabOf(moment, target.id);

	if (!tab) {
		return refusal(NOT_HELD.replace("{id}", target.id));
	}

	const isKeptWhereItIs = !target.isMoved || splitOfTab(moment, tab.id) !== null;
	return {
		showing: isKeptWhereItIs ? showing : withMoved(showing, placeTab(moment, tab.id, place)),
		tab,
	};
}


function withViewSettled(showing: Showing): Showing {
	const { view } = showing.moment;

	if (view === "app" || shownTabIdOf(showing.moment, view) !== null) {
		return showing;
	}

	return withView(showing, "app", `no ${view} tab is left after navigating`);
}
