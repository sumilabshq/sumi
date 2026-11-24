import { chatAppOf } from "../../../shared/lib/tabs/app-abilities.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import { momentOfWindow, placedWith } from "../../../shared/lib/tabs/kept-tabs.js";
import { openTabAs } from "../../../shared/lib/tabs/once-tabs.js";
import { WORKSPACE_END } from "../../../shared/lib/tabs/tab-lists.js";
import type { HostTabsMoment } from "../../../shared/lib/tabs/host-tabs.js";
import type { Answer } from "../../../shared/lib/settling/settling.js";
import type { MovePlaces } from "../../../shared/lib/flows/flow-moves.js";
import type { PlacedTabs } from "../../../shared/schema/tabs.schema.js";

export interface AdoptedChats {
	readonly adoptedIds: readonly string[];
}

const NOT_CONVERTED = "the workspace holds no flows yet: it is not converted";
const NO_CHAT_APP = "no app of the workspace is a chat: no chat can be given a tab";

export function adoptChatsMove(chatIds: readonly string[], apps: PlacedApps): MovePlaces<Answer<AdoptedChats>> {
	return (now) => {
		const chatApp = chatAppOf(apps);

		if (now.flows === null || chatApp === null) {
			const reason = now.flows === null ? NOT_CONVERTED : NO_CHAT_APP;
			return { next: null, reason, answer: { isRefused: true, reason } };
		}

		const known = knownTabIdsOf(now.tabs);
		const adoptedIds = [...new Set(chatIds)].filter((id) => !known.has(id));

		if (adoptedIds.length === 0) {
			return {
				next: null,
				reason: "adopt chats skipped: every chat has a tab, is closed or is kept in a window session",
				answer: { isRefused: false, value: { adoptedIds } },
			};
		}

		const moment = adoptedIds.reduce((was, id) => withChatTab(was, chatApp, id), momentOfWindow(now.tabs, null, apps));
		return {
			next: { tabs: placedWith(now.tabs, null, moment), flows: now.flows },
			reason: `chats without a tab ${adoptedIds.join(", ")} → one tab each (adopted)`,
			answer: { isRefused: false, value: { adoptedIds } },
		};
	};
}

function knownTabIdsOf(placed: PlacedTabs): ReadonlySet<string> {
	return new Set([
		...placed.tabs.map(({ id }) => id),
		...placed.closed.map(({ tab }) => tab.id),
		...placed.sessions.flatMap(({ tabs }) => tabs.map(({ id }) => id)),
	]);
}

function withChatTab(moment: HostTabsMoment, chatApp: string, id: string): HostTabsMoment {
	const opened = openTabAs(moment, { app: chatApp, pageId: null }, { id, place: WORKSPACE_END });
	return {
		...opened.moment,
		shownId: moment.shownId,
		selectedId: moment.selectedId,
	};
}
