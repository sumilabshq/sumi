import { keepChatTabs } from "../../../shared/lib/tabs/chat-tabs.js";
import { heldTabOf } from "../../../shared/lib/tabs/host-tabs.js";
import { markAfter, markSeen, recordTurn, withRunningMarksCleared } from "../../../shared/lib/tabs/tab-marks.js";
import { movedPlan, refusal } from "../../../shared/lib/settling/settling.js";
import type { MomentPlan, Planned, Refusal } from "../../../shared/lib/settling/settling.js";
import type { AppPage, NamedRecord, TabTurn } from "../../../shared/schema/tab-facts.schema.js";
import { abilitiesOf } from "../../../shared/lib/tabs/app-abilities.js";
import { pushedTab } from "../../../shared/lib/tabs/tab-history.js";
import type { HostTab, HostTabsMoment } from "../../../shared/lib/tabs/host-tabs.js";
import type { TabMark } from "../../../shared/schema/tabs.schema.js";

const NOT_HELD = 'the host holds no tab "{id}" to mark seen';
const NO_APP_PAGE = 'the tab "{id}" is not drawn by an app that reports its page';
const FOREIGN_FAVICON = "a favicon not served by {app} itself was dropped";
const DATA_IMAGE = "data:image/";
const APP_FILES = "sumi-app://{app}/";

export interface TurnMarks {
	readonly was: TabMark | null;
	readonly mark: TabMark | null;
}

interface FaviconKept {
	readonly page: AppPage;
	readonly dropped: string | null;
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

export function recordAppPagePlan(page: AppPage): MomentPlan<null> {
	return (moment) => {
		const tab = heldTabOf(moment, page.id);

		if (tab === undefined) {
			return movedPlan(moment, null, null);
		}

		if (!isReportingItsPage(tab.app)) {
			return refusal(NO_APP_PAGE.replace("{id}", page.id));
		}

		return appPageRecorded(moment, tab, page);
	};
}

function isReportingItsPage(app: string): boolean {
	return abilitiesOf(app).runsInPage && app !== "browser";
}

function appPageRecorded(moment: HostTabsMoment, tab: HostTab, page: AppPage): Planned<null> | Refusal {
	const kept = withOwnFaviconOnly(tab.app, page);
	const recorded = withAppPage(tab, kept.page);

	if (recorded === tab) {
		return kept.dropped === null ? movedPlan(moment, null, null) : refusal(kept.dropped);
	}

	return movedPlan(
		moment,
		{
			moment: withTabRecorded(moment, recorded),
			reason: appPageReasonOf(tab, recorded, kept.dropped),
		},
		null,
	);
}

function withOwnFaviconOnly(app: string, page: AppPage): FaviconKept {
	if (page.favicon === undefined || isOwnFavicon(app, page.favicon)) {
		return {
			page,
			dropped: null,
		};
	}

	return {
		page: {
			...page,
			favicon: undefined,
		},
		dropped: FOREIGN_FAVICON.replace("{app}", app),
	};
}

function isOwnFavicon(app: string, favicon: string): boolean {
	return favicon.startsWith(DATA_IMAGE) || favicon.startsWith(APP_FILES.replace("{app}", app));
}

function appPageReasonOf(tab: HostTab, recorded: HostTab, dropped: string | null): string {
	const said = `tab ${tab.id} page ${tab.lastAddress ?? "none"} → ${recorded.lastAddress ?? "none"}, title ${tab.lastTitle ?? "none"} → ${recorded.lastTitle ?? "none"}, actions ${actionIdsSaidOf(tab)} → ${actionIdsSaidOf(recorded)} (the app reported it`;
	return dropped === null ? `${said})` : `${said}; ${dropped})`;
}

function withAppPage(tab: HostTab, { address, how, title, favicon, actions }: AppPage): HostTab {
	const isPushed = how === "push" && address !== undefined && address !== (tab.lastAddress ?? "");
	const moved = isPushed ? pushedTab(tab, address) : tab;
	const next = {
		...moved,
		lastAddress: address ?? moved.lastAddress,
		lastTitle: title ?? moved.lastTitle,
		lastFavicon: favicon ?? moved.lastFavicon,
		lastActions: actions ?? moved.lastActions,
	};
	return !isPushed && isSameRecord(tab, next) ? tab : next;
}

function isSameRecord(tab: HostTab, next: HostTab): boolean {
	return (
		next.lastAddress === tab.lastAddress &&
		next.lastTitle === tab.lastTitle &&
		next.lastFavicon === tab.lastFavicon &&
		actionsSaidOf(next) === actionsSaidOf(tab)
	);
}

function actionsSaidOf(tab: HostTab): string {
	return JSON.stringify(tab.lastActions ?? []);
}

function actionIdsSaidOf(tab: HostTab): string {
	return (tab.lastActions ?? []).map(({ id }) => id).join(",") || "none";
}

function withTabRecorded(moment: HostTabsMoment, recorded: HostTab): HostTabsMoment {
	return {
		...moment,
		tabs: moment.tabs.map((one) => (one.id === recorded.id ? recorded : one)),
	};
}
