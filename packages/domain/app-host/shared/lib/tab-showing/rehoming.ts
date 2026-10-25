import { flatTabIdsOf, tabOf } from "../host-tabs/host-tabs.js";
import type { HostTab } from "../host-tabs/host-tabs.js";
import { WORKSPACE_LIST } from "../host-tabs/tab-lists.js";
import { chatHomeOf } from "./chat-home.js";
import { shownAppOf, shownTabIdOf, withEffect, withTabShown } from "./showing.js";
import type { Showing } from "./showing.js";
import { tabIdsInPanesOf } from "./tab-facts.js";
import type { TabFacts } from "./tab-facts.js";

export function withHomeFollowed(was: Showing, next: Showing, facts: TabFacts): Showing {
	const shownBefore = facts.shownTabPaneId === null ? null : shownTabIdOf(was.moment, shownAppOf(was.shownView));
	const moved = next.moment.tabs.filter(
		(tab) =>
			chatHomeOf(was.moment, tab.id) !== chatHomeOf(next.moment, tab.id) &&
			(tab.id === shownBefore || facts.tabPanes.some((pane) => pane.tabId === tab.id)),
	);

	if (moved.length === 0) {
		return next;
	}

	console.info(`[widgetarium] tabs ${moved.map((tab) => tab.id).join(", ")} changed home, so their panes follow them`);
	return withPanesRehomed(next, facts, { moved, shownBefore });
}

export function withTabsAtHome(showing: Showing, facts: TabFacts): Showing {
	const strays = facts.tabPanes.flatMap(({ paneId, tabId }) => {
		const tab = showing.moment.tabs.find((one) => one.id === tabId);
		const home = tab === undefined ? undefined : chatHomeOf(showing.moment, tabId);
		const standsIn = facts.groupOfPane.get(paneId) ?? null;
		const isReachable = home === null || (home !== undefined && facts.chatGroupIds.includes(home));
		return tab !== undefined && isReachable && home !== standsIn ? [tab] : [];
	});

	if (strays.length === 0) {
		return showing;
	}

	console.info(`[widgetarium] tabs ${strays.map((tab) => tab.id).join(", ")} stood away from home, so they go back`);
	return withPanesRehomed(showing, facts, { moved: strays, shownBefore: null });
}

interface Rehoming {
	readonly moved: readonly HostTab[];
	readonly shownBefore: string | null;
}

function withPanesRehomed(next: Showing, facts: TabFacts, { moved, shownBefore }: Rehoming): Showing {
	const movedIds = moved.map((tab) => tab.id);
	const leftPanes = facts.tabPanes.filter((pane) => !movedIds.includes(pane.tabId));
	const panedIds = movedIds.filter((id) => facts.tabPanes.some((pane) => pane.tabId === id));
	const isTargetLeft = leftPanes.some((pane) => pane.paneId === facts.tabTargetId);
	const unpaned: TabFacts = {
		...facts,
		tabPanes: leftPanes,
		hasTabTarget: facts.hasTabTarget && isTargetLeft,
		tabTargetId: isTargetLeft ? facts.tabTargetId : null,
	};
	const unpanedNext = panedIds.length === 0 ? next : withEffect(next, { kind: "close-panes", tabIds: panedIds });
	const followed = moved.reduce((showing, tab) => withTabShown(showing, unpaned, tab), unpanedNext);
	return shownBefore !== null && movedIds.includes(shownBefore)
		? withShownPaneRefilled(followed, unpaned, movedIds)
		: followed;
}

function withShownPaneRefilled(showing: Showing, facts: TabFacts, leftIds: readonly string[]): Showing {
	const inPanes = tabIdsInPanesOf(facts);
	const freeId = flatTabIdsOf(showing.moment, WORKSPACE_LIST).find(
		(id) => !inPanes.includes(id) && !leftIds.includes(id),
	);
	console.info(`[widgetarium] shown tab pane → ${freeId ?? "closed"} (its tab moved to a chat)`);
	return freeId === undefined
		? withEffect(showing, { kind: "close-shown-tab-pane" })
		: withTabShown(showing, facts, tabOf(showing.moment, freeId));
}
