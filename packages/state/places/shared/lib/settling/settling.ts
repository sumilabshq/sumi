import { refuse } from "@widgetarium/core/requests";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import type { TabsAsk, TabsSettled } from "../../schema/screen.schema.js";
import { showingOf } from "../showing/showing.js";
import type { Showing } from "../showing/showing.js";
import { tabFactsOf } from "../showing/tab-facts.js";
import type { TabFacts } from "../showing/tab-facts.js";
import type { HostTabsMoment, MovedTabs } from "../tabs/host-tabs.js";
import { momentOfWindow, placedWith, tabsTransitionSaid } from "../tabs/kept-tabs.js";
import { tabBreaksOf } from "../tabs/tab-invariants.js";

export interface PlacedTabsMove<T> {
	readonly next: PlacedTabs | null;
	readonly reason: string;
	readonly answer: T;
}

export type MovePlacedTabs<T> = (now: PlacedTabs) => PlacedTabsMove<T>;

export interface Refusal {
	readonly refusal: string;
}

export interface Planned<E> {
	readonly showing: Showing;
	readonly extra: E;
}

export type Answer<T> =
	{ readonly isRefused: true; readonly reason: string } | { readonly isRefused: false; readonly value: T };

export type ShowingPlan = (showing: Showing, facts: TabFacts) => Showing | Refusal;

export type ExtraPlan<E> = (showing: Showing, facts: TabFacts) => Planned<E> | Refusal;

export type MomentPlan<E> = (moment: HostTabsMoment) => Planned<E> | Refusal;

export interface Settled<E> extends TabsSettled {
	readonly extra: E;
}

export function answered<T>(answer: Answer<T>): T {
	return answer.isRefused ? refuse(answer.reason) : answer.value;
}

export function settledOf(answer: Answer<TabsSettled>): TabsSettled {
	const { view, effects } = answered(answer);
	return {
		view,
		effects,
	};
}

export function refusal(reason: string): Refusal {
	return { refusal: reason };
}

export function isRefusal(planned: object): planned is Refusal {
	return "refusal" in planned;
}

export function plannedWith<E>(showing: Showing, extra: E): Planned<E> {
	return {
		showing,
		extra,
	};
}

export function settling(at: TabsAsk, plan: ShowingPlan): MovePlacedTabs<Answer<TabsSettled>> {
	return settlingWith(at, (showing, facts) => {
		const planned = plan(showing, facts);
		return isRefusal(planned) ? planned : plannedWith(planned, null);
	});
}

export function settlingWith<E>(at: TabsAsk, plan: ExtraPlan<E>): MovePlacedTabs<Answer<Settled<E>>> {
	return (placed) => {
		const was = showingOf(momentOfWindow(placed, at.window), at.view);
		const planned = plan(was, tabFactsOf(at.screen));

		if (isRefusal(planned)) {
			return refusedMove(planned.refusal);
		}

		const { showing } = planned;
		return checkedMove(
			{ placed, window: at.window, was: was.moment, next: showing.moment },
			showing.reasons,
			settledValueOf(planned),
		);
	};
}

export function moving<E>(window: string | null, plan: MomentPlan<E>): MovePlacedTabs<Answer<E>> {
	return (placed) => {
		const was = momentOfWindow(placed, window);
		const planned = plan(was);

		if (isRefusal(planned)) {
			return refusedMove(planned.refusal);
		}

		return checkedMove({ placed, window, was, next: planned.showing.moment }, planned.showing.reasons, planned.extra);
	};
}

export function movedPlan<E>(was: HostTabsMoment, moved: MovedTabs | null, extra: E): Planned<E> {
	const shown = showingOf(was, "app");
	return plannedWith(moved === null ? shown : { ...shown, moment: moved.moment, reasons: [moved.reason] }, extra);
}

interface MomentChange {
	readonly placed: PlacedTabs;
	readonly window: string | null;
	readonly was: HostTabsMoment;
	readonly next: HostTabsMoment;
}

function checkedMove<T>(change: MomentChange, reasons: readonly string[], value: T): PlacedTabsMove<Answer<T>> {
	const reason = reasons.join("; ");

	if (change.next === change.was) {
		return acceptedMove(null, reason || "nothing changes", value);
	}

	const broken = newlyBrokenBy(change);

	if (broken !== null) {
		console.warn(`[widgetarium] tabs refused (${reason}): ${broken}`);
		return refusedMove(broken);
	}

	console.info(`[widgetarium] ${tabsTransitionSaid(change.was, change.next, reason)}`);
	return acceptedMove(placedWith(change.placed, change.window, change.next), reason, value);
}

function newlyBrokenBy({ was, next }: MomentChange): string | null {
	const before = new Set(tabBreaksOf(was));
	return tabBreaksOf(next).find((broken) => !before.has(broken)) ?? null;
}

function acceptedMove<T>(next: PlacedTabs | null, reason: string, value: T): PlacedTabsMove<Answer<T>> {
	return {
		next,
		reason,
		answer: { isRefused: false, value },
	};
}

function refusedMove<T>(reason: string): PlacedTabsMove<Answer<T>> {
	return {
		next: null,
		reason,
		answer: { isRefused: true, reason },
	};
}

function settledValueOf<E>({ showing, extra }: Planned<E>): Settled<E> {
	return {
		view: showing.shownView,
		effects: [...showing.effects],
		extra,
	};
}
