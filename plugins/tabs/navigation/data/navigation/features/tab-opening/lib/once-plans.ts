import type { OnceOpened, TabsAsk } from "../../../shared/schema/screen.schema.js";
import type { OpenOnceAsk } from "../../../shared/schema/tab-asks.schema.js";
import type { PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import { plannedWith, refusal, settlingWith } from "../../../shared/lib/settling/settling.js";
import type {
	Answer,
	ExtraPlan,
	MovePlacedTabs,
	PlacedTabsMove,
	Settled,
} from "../../../shared/lib/settling/settling.js";
import { freshTabOf } from "../../../shared/lib/showing/new-tab-page.js";
import { withOpenedTabShown } from "../../../shared/lib/showing/opening.js";
import { withMoved } from "../../../shared/lib/showing/showing.js";
import { withClosedReopened } from "../../../shared/lib/showing/reopening.js";
import { isPageApp } from "../../../shared/lib/tabs/app-abilities.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import { heldTabOf } from "../../../shared/lib/tabs/host-tabs.js";
import { listStartOf, openTabAs, withTabFreed } from "../../../shared/lib/tabs/once-tabs.js";
import { heldAt, holderLabelOf } from "../../../shared/lib/tabs/tab-leases.js";
import { tabFactsOf } from "../../../shared/lib/showing/tab-facts.js";
import { withAddressKept } from "../../../shared/lib/showing/opening-plans.js";
import { withExistingShown } from "./navigating-plans.js";

type OnceAsk = Omit<OpenOnceAsk, "at">;

export interface OnceOpening {
	readonly at: TabsAsk;
	readonly apps: PlacedApps;
}

interface Freed {
	readonly placed: PlacedTabs;
	readonly reason: string;
}

const HELD_ELSEWHERE = "{id} stays in {window}: it is open there, that window comes forward";
const FREED_FROM_SESSION = "{id} leaves the session of a closed window";
const NO_RECORD = "{id} is no tab of {app} here or anywhere: {app} draws no page to open it from";

export function openedOnce(opening: OnceOpening, ask: OnceAsk): MovePlacedTabs<Answer<OnceOpened>> {
	return (stored) => {
		const held = heldAt(stored, { window: opening.at.window, tabWindows: tabFactsOf(opening.at.screen).tabWindows });
		const holder = holderLabelOf(held, ask.id);

		if (holder !== null) {
			return heldElsewhereMove(ask.id, holder);
		}

		const freed = stored.tabs.some((tab) => tab.id === ask.id) ? null : freedOf(stored, ask);
		const moved = settlingWith(opening.at, opening.apps, onceOpenPlan(ask))(freed?.placed ?? stored);
		return withFreedSaid(onceMoveOf(ask.id, moved), freed?.reason ?? null);
	};
}

function onceOpenPlan(ask: OnceAsk): ExtraPlan<null> {
	return (showing, facts) => {
		const held = heldTabOf(showing.moment, ask.id);

		if (held) {
			return plannedWith(withExistingShown(showing, facts, held), null);
		}

		const reopened = withClosedReopened(showing, facts, ask.id);

		if (reopened !== null) {
			return plannedWith(reopened, null);
		}

		if (!isPageApp(showing.moment.apps, ask.app)) {
			return refusal(NO_RECORD.replace("{id}", ask.id).replaceAll("{app}", ask.app));
		}

		const fresh = freshTabOf(showing.moment.apps, ask.app, facts.isBrowserAvailable);
		const opened = withAddressKept(
			openTabAs(showing.moment, fresh, { id: ask.id, place: listStartOf(showing.moment) }),
			ask.address,
		);
		return plannedWith(withOpenedTabShown(withMoved(showing, opened), facts, opened.tab, ask.address), null);
	};
}

function heldElsewhereMove(id: string, window: string): PlacedTabsMove<Answer<OnceOpened>> {
	return {
		next: null,
		reason: HELD_ELSEWHERE.replace("{id}", id).replace("{window}", window),
		answer: {
			isRefused: false,
			value: {
				id,
				heldBy: window,
				effects: [
					{
						kind: "focus-window",
						window,
					},
				],
			},
		},
	};
}

function freedOf(stored: PlacedTabs, ask: OnceAsk): Freed | null {
	const placed = withTabFreed(stored, ask.id, ask.address);

	if (placed === null) {
		return null;
	}

	const reason = FREED_FROM_SESSION.replace("{id}", ask.id);
	console.warn(`[widgetarium] ${reason}`);
	return {
		placed,
		reason,
	};
}

function onceMoveOf(id: string, moved: PlacedTabsMove<Answer<Settled<null>>>): PlacedTabsMove<Answer<OnceOpened>> {
	const { answer } = moved;
	return {
		...moved,
		answer: answer.isRefused
			? answer
			: {
					isRefused: false,
					value: {
						id,
						heldBy: null,
						effects: answer.value.effects,
					},
				},
	};
}

function withFreedSaid<T>(moved: PlacedTabsMove<T>, freed: string | null): PlacedTabsMove<T> {
	if (freed === null) {
		return moved;
	}

	return {
		...moved,
		reason: `${freed}; ${moved.reason}`,
	};
}
