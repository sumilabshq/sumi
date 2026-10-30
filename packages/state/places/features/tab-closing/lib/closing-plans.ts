import { refusal } from "../../../shared/lib/settling/settling.js";
import type { ShowingPlan } from "../../../shared/lib/settling/settling.js";
import { withGroupClosed, withTabsClosed } from "../../../shared/lib/showing/closing.js";
import { liveTabOf } from "../../../shared/lib/showing/opening.js";
import { shownAppOf, shownTabIdOf } from "../../../shared/lib/showing/showing.js";
import { chatOfTab, findGroup, heldTabOf, isPageTab, pageTabIdsOf } from "../../../shared/lib/tabs/host-tabs.js";
import { WORKSPACE_LIST } from "../../../shared/lib/tabs/tab-lists.js";

const NOT_HELD = 'the host holds no tab "{id}"';
const NOTHING_SHOWN = "no tab is shown";
const NO_GROUP = 'no group "{id}"';
const NOT_OPEN = 'the essential "{id}" is not open';
const CHAT_STAYS = 'the tab "{id}" is a chat: a chat is not closed from here yet';
const GROUP_HOLDS_CHAT = 'the group "{id}" holds a chat: a chat is not closed from here yet';

export function closeTabPlan(id: string): ShowingPlan {
	return (showing, facts) => {
		const tab = heldTabOf(showing.moment, id);

		if (!tab) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		if (!isPageTab(tab)) {
			return refusal(CHAT_STAYS.replace("{id}", id));
		}

		return withTabsClosed(showing, facts, { ids: [id], reason: `close ${id}` });
	};
}

export function closeOthersPlan(id: string): ShowingPlan {
	return (showing, facts) => {
		if (!heldTabOf(showing.moment, id)) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		const listId = chatOfTab(showing.moment, id) ?? WORKSPACE_LIST;
		const others = pageTabIdsOf(showing.moment, listId).filter((other) => other !== id);
		return withTabsClosed(showing, facts, { ids: others, reason: `close ${others.length} tabs beside ${id}` });
	};
}

export function closeShownPlan(): ShowingPlan {
	return (showing, facts) => {
		const shownId = shownTabIdOf(showing.moment, shownAppOf(showing.shownView));

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

		const holdsChat = group.tabIds.some((tabId) => heldTabOf(showing.moment, tabId)?.app === "chat");
		return holdsChat ? refusal(GROUP_HOLDS_CHAT.replace("{id}", id)) : withGroupClosed(showing, facts, group);
	};
}

export function closeEssentialPlan(essentialId: string): ShowingPlan {
	return (showing, facts) => {
		const live = liveTabOf(showing.moment, essentialId);

		if (!live) {
			return refusal(NOT_OPEN.replace("{id}", essentialId));
		}

		return withTabsClosed(showing, facts, { ids: [live.id], reason: `close essential ${essentialId}` });
	};
}
