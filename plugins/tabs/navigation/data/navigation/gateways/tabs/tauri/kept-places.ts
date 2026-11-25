import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { FlowsDocSchema } from "../../../shared/schema/flows.schema.js";
import type { FlowsDoc } from "../../../shared/schema/flows.schema.js";
import { PlacedTabsSchema } from "../../../shared/schema/tabs.schema.js";
import type { MovePlaces, PlacedPlaces } from "../../../shared/lib/flows/flow-moves.js";

export const KeptNavigationSchema = z.looseObject({
	tabs: z.unknown().optional(),
	flows: z.unknown().optional(),
	unreadableTabs: z.unknown().optional(),
	panesCarried: z.boolean().optional(),
});

export type KeptNavigation = z.infer<typeof KeptNavigationSchema>;

const UNREADABLE_FLOWS =
	"[widgetarium] navigation flows cannot be read, they stay on disk untouched and no flows command runs: {error}";

export function placesIn({ tabs, flows }: KeptNavigation): PlacedPlaces {
	return {
		tabs: PlacedTabsSchema.parse(tabs),
		flows: flowsIn(flows),
	};
}

export function commitPlaces<T>(kept: HeldDoc<KeptNavigation>, move: MovePlaces<T>): Promise<T> {
	return kept.changeOnNewest((now) => {
		const was = placesIn(now);
		const moved = move(was);
		return {
			patch: moved.next === null ? null : placesPatchOf(moved.next, { now, was }),
			reason: `navigation ${moved.reason}`,
			answer: moved.answer,
		};
	});
}

interface PlacesRead {
	readonly now: KeptNavigation;
	readonly was: PlacedPlaces;
}

function placesPatchOf(next: PlacedPlaces, { now, was }: PlacesRead): Partial<KeptNavigation> {
	if (next.flows === null || (was.flows === null && now.flows !== undefined)) {
		return { tabs: next.tabs };
	}

	return {
		tabs: next.tabs,
		flows: next.flows === was.flows ? now.flows : next.flows,
	};
}

function flowsIn(flows: unknown): FlowsDoc | null {
	if (flows === undefined) {
		return null;
	}

	const parsed = FlowsDocSchema.safeParse(flows);

	if (!parsed.success) {
		console.error(UNREADABLE_FLOWS.replace("{error}", () => parsed.error.message));
		return null;
	}

	return parsed.data;
}
