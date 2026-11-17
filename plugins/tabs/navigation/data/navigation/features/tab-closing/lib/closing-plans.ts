import { refusal } from "../../../shared/lib/settling/settling.js";
import type { ShowingPlan } from "../../../shared/lib/settling/settling.js";
import { withGroupClosed, withTabsClosed } from "../../../shared/lib/showing/closing.js";
import { shownAppOf, shownTabIdOf } from "../../../shared/lib/showing/showing.js";
import { chatOfTab, findGroup, flatTabIdsOf, heldTabOf } from "../../../shared/lib/tabs/host-tabs.js";
import { WORKSPACE_LIST } from "../../../shared/lib/tabs/tab-lists.js";
import { holderLabelOf } from "../../../shared/lib/tabs/tab-leases.js";

const NOT_HELD = 'the host holds no tab "{id}"';
const NOTHING_SHOWN = "no tab is shown";
const NO_GROUP = 'no group "{id}"';
const HELD_ELSEWHERE = 'the tab "{id}" is open in window {window}: only that window closes it';
const GROUP_HELD_ELSEWHERE =
	'the group "{id}" holds the tab "{tab}", open in window {window}: only that window closes it';

export function closeTabPlan(id: string): ShowingPlan {
	return (showing, facts) => {
		const tab = heldTabOf(showing.moment, id);

		if (!tab) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		const holder = holderLabelOf(showing.moment.heldElsewhere, tab.id);

		if (holder !== null) {
			return refusal(HELD_ELSEWHERE.replace("{id}", tab.id).replace("{window}", holder));
		}

		return withTabsClosed(showing, facts, { ids: [tab.id], reason: `close ${tab.id}` });
	};
}

export function closeOthersPlan(id: string): ShowingPlan {
	return (showing, facts) => {
		if (!heldTabOf(showing.moment, id)) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		const listId = chatOfTab(showing.moment, id) ?? WORKSPACE_LIST;
		const others = flatTabIdsOf(showing.moment, listId).filter(
			(other) => other !== id && !showing.moment.heldElsewhere.has(other),
		);
		return withTabsClosed(showing, facts, { ids: others, reason: `close ${others.length} tabs beside ${id}` });
	};
}

export function closeShownPlan(): ShowingPlan {
	return (showing, facts) => {
		const shownId = shownTabIdOf(showing.moment, shownAppOf(showing.moment.view));

		if (shownId === null) {
			return refusal(NOTHING_SHOWN);
		}

		return withTabsClosed(showing, facts, { ids: [shownId], reason: `close the shown ${shownId}` });
	};
}

export function closeGroupPlan(id: string): ShowingPlan {
	return (showing, facts) => {
		const group = findGroup(showing.moment.groups, id);

		if (!group) {
			return refusal(NO_GROUP.replace("{id}", id));
		}

		const heldId = group.tabIds.find((tabId) => showing.moment.heldElsewhere.has(tabId));

		if (heldId !== undefined) {
			return refusal(
				GROUP_HELD_ELSEWHERE.replace("{id}", id)
					.replace("{tab}", heldId)
					.replace("{window}", holderLabelOf(showing.moment.heldElsewhere, heldId) ?? ""),
			);
		}

		return withGroupClosed(showing, facts, group);
	};
}
