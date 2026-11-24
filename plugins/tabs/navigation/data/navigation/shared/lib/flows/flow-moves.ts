import type { FlowsDoc } from "../../schema/flows.schema.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import type { MovePlacedTabs } from "../settling/settling.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import { flowsOf } from "./flow-conversion.js";
import type { FlowsConverted } from "./flow-conversion.js";

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
