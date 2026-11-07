import { keepChatTabs } from "../../../shared/lib/tabs/chat-tabs.js";
import { heldTabOf } from "../../../shared/lib/tabs/host-tabs.js";
import { markAfter, markSeen, recordTurn, withRunningMarksCleared } from "../../../shared/lib/tabs/tab-marks.js";
import { movedPlan, refusal } from "../../../shared/lib/settling/settling.js";
import type { MomentPlan, Planned, Refusal } from "../../../shared/lib/settling/settling.js";
import type { AppAddress, NamedRecord, TabTurn } from "../../../shared/schema/tab-facts.schema.js";
import { abilitiesOf } from "../../../shared/lib/tabs/app-abilities.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import { pushedTab } from "../../../shared/lib/tabs/tab-history.js";
import type { HostTab, HostTabsMoment } from "../../../shared/lib/tabs/host-tabs.js";
import type { TabMark } from "../../../shared/schema/tabs.schema.js";

const NOT_HELD = 'the host holds no tab "{id}" to mark seen';
const NO_APP_PAGE = 'the tab "{id}" is not drawn by an app that reports its page';

export interface TurnMarks {
	readonly was: TabMark | null;
	readonly mark: TabMark | null;
}

const NOT_KEPT: TurnMarks = {
	was: null,
	mark: null,
};

export function keepChatTabsPlan(chats: readonly NamedRecord[]): MomentPlan<null> {
	return (moment) => movedPlan(moment, keepChatTabs(moment, chats), null);
}

export function recordTurnPlan(turn: TabTurn): MomentPlan<TurnMarks> {
	return (moment) => {
		const tab = heldTabOf(moment, turn.id);

		if (tab === undefined) {
			return movedPlan(moment, null, NOT_KEPT);
		}

		return movedPlan(moment, recordTurn(moment, tab, turn), { was: tab.mark, mark: markAfter(tab.mark, turn) });
	};
}

export function forgetRunningTurnsPlan(): MomentPlan<null> {
	return (moment) => movedPlan(moment, withRunningMarksCleared(moment), null);
}

export function markSeenPlan(id: string): MomentPlan<null> {
	return (moment) => {
		const tab = heldTabOf(moment, id);

		if (tab === undefined) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		return movedPlan(moment, markSeen(moment, tab), null);
	};
}

export function recordAppAddressPlan(page: AppAddress): MomentPlan<null> {
	return (moment) => {
		const tab = heldTabOf(moment, page.id);

		if (tab === undefined) {
			return movedPlan(moment, null, null);
		}

		if (!isReportingItsPage(moment.apps, tab.app)) {
			return refusal(NO_APP_PAGE.replace("{id}", page.id));
		}

		return appPageRecorded(moment, tab, page);
	};
}

function isReportingItsPage(apps: PlacedApps, app: string): boolean {
	return abilitiesOf(apps, app).runsInPage && !abilitiesOf(apps, app).navigates;
}

function appPageRecorded(moment: HostTabsMoment, tab: HostTab, page: AppAddress): Planned<null> | Refusal {
	const recorded = withAppAddress(tab, page);

	if (recorded === tab) {
		return movedPlan(moment, null, null);
	}

	return movedPlan(
		moment,
		{
			moment: withTabRecorded(moment, recorded),
			reason: `tab ${tab.id} page ${tab.lastAddress ?? "none"} → ${recorded.lastAddress ?? "none"} (the app reported it)`,
		},
		null,
	);
}

function withAppAddress(tab: HostTab, { address, how }: AppAddress): HostTab {
	if (address === undefined || address === (tab.lastAddress ?? "")) {
		return tab;
	}

	const moved = how === "push" ? pushedTab(tab, address) : tab;
	return {
		...moved,
		lastAddress: address,
	};
}

function withTabRecorded(moment: HostTabsMoment, recorded: HostTab): HostTabsMoment {
	return {
		...moment,
		tabs: moment.tabs.map((one) => (one.id === recorded.id ? recorded : one)),
	};
}
