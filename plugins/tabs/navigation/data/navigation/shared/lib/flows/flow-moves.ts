import type { FlowsDoc } from "../../schema/flows.schema.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { isRefusal } from "../settling/settling.js";
import type { Answer, MovePlacedTabs, Refusal } from "../settling/settling.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import { flowsOf } from "./flow-conversion.js";
import type { FlowsConverted } from "./flow-conversion.js";
import { withViewsRecorded } from "./window-trails.js";

export interface PlacedPlaces {
	readonly tabs: PlacedTabs;
	readonly flows: FlowsDoc | null;
}

export interface PlacesMove<T> {
	readonly next: PlacedPlaces | null;
	readonly reason: string;
	readonly answer: T;
}

export type MovePlaces<T> = (now: PlacedPlaces) => PlacesMove<T>;

export interface ConversionMoment {
	readonly apps: PlacedApps;
	readonly sourceRev: number;
	readonly now: number;
}

export interface FlowsNow {
	readonly tabs: PlacedTabs;
	readonly flows: FlowsDoc;
}

export interface FlowsPlanned<T> {
	readonly flows: FlowsDoc;
	readonly tabs?: PlacedTabs;
	readonly reason: string;
	readonly value: T;
}

export type FlowsPlan<T> = (now: FlowsNow) => FlowsPlanned<T> | Refusal;

const NOT_CONVERTED = "the workspace holds no flows yet: it is not converted";

const ALREADY_CONVERTED = "the flows already stand in the doc, the old tabs are not read again";

export function tabsMoveAsPlaces<T>(move: MovePlacedTabs<T>): MovePlaces<T> {
	return (now) => {
		const moved = move(now.tabs);
		return {
			next: moved.next === null ? null : { tabs: moved.next, flows: now.flows },
			reason: moved.reason,
			answer: moved.answer,
		};
	};
}

export function flowsConversionMove(moment: ConversionMoment): MovePlaces<FlowsConverted> {
	return (now) => {
		if (now.flows !== null) {
			return {
				next: null,
				reason: ALREADY_CONVERTED,
				answer: { isRefused: true, reasons: [ALREADY_CONVERTED] },
			};
		}

		const converted = flowsOf({ placed: now.tabs, ...moment });

		if (converted.isRefused) {
			return {
				next: null,
				reason: converted.reasons.join("; "),
				answer: converted,
			};
		}

		return {
			next: { tabs: now.tabs, flows: converted.doc },
			reason: `flows none → ${converted.said.at(-1) ?? "converted"}`,
			answer: converted,
		};
	};
}

export function flowsMove<T>(plan: FlowsPlan<T>): MovePlaces<Answer<T>> {
	return (now) => {
		if (now.flows === null) {
			return refusedMove(NOT_CONVERTED);
		}

		const planned = plan({ tabs: now.tabs, flows: now.flows });

		if (isRefusal(planned)) {
			return refusedMove(planned.refusal);
		}

		const isUnchanged = planned.flows === now.flows && planned.tabs === undefined;
		return {
			next: isUnchanged ? null : { tabs: planned.tabs ?? now.tabs, flows: withViewsRecorded(now.flows, planned.flows) },
			reason: planned.reason,
			answer: { isRefused: false, value: planned.value },
		};
	};
}

function refusedMove<T>(reason: string): PlacesMove<Answer<T>> {
	return {
		next: null,
		reason,
		answer: { isRefused: true, reason },
	};
}
