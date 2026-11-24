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

export function placesIn(kept: HeldDoc<KeptNavigation>): PlacedPlaces {
	const { tabs, flows } = kept.now();
	return {
		tabs: PlacedTabsSchema.parse(tabs),
		flows: flowsIn(flows),
	};
}

export async function commitPlaces<T>(kept: HeldDoc<KeptNavigation>, move: MovePlaces<T>): Promise<T> {
	const was = placesIn(kept);
	const moved = move(was);

	if (moved.next === null) {
		return moved.answer;
	}

	const { tabs, flows } = moved.next;
	kept.change(flows === null || flows === was.flows ? { tabs } : { tabs, flows }, `navigation ${moved.reason}`);
	await kept.flush();
	return moved.answer;
}

function flowsIn(flows: unknown): FlowsDoc | null {
	const parsed = FlowsDocSchema.safeParse(flows);
	return parsed.success ? parsed.data : null;
}
