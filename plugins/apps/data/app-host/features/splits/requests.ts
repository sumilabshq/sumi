import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import {
	PlaceInViewCommand as PlacesPlaceInViewCommand,
	RemoveFromSplitCommand as PlacesRemoveFromSplitCommand,
	ResizeSplitCommand as PlacesResizeSplitCommand,
	ShownSplitQuery as PlacesShownSplitQuery,
} from "@widgetarium/places";
import { ClosePaneCommand } from "@widgetarium/layout";
import { StudioCoreChangedEvent } from "../../gateways/core-changes/core-changes.events.js";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { ShownSplitSchema, SplitPlacingSchema } from "../../shared/schema/split.schema.js";

export const ShownSplitQuery = query("shown-split")
	.public()
	.output(ShownSplitSchema)
	.handle(async (_input, { send, studioWindow }) =>
		send(PlacesShownSplitQuery, { window: studioWindow.windowLabel() }),
	);

export const PlaceInViewCommand = command("place-in-view")
	.public()
	.input(SplitPlacingSchema)
	.output(z.object({ isPlaced: z.boolean() }))
	.idempotencyKey(Repeatable)
	.handle(async (placing, { send, emit, ...injects }) => {
		const placed = await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesPlaceInViewCommand, { at, ...placing }),
		);
		return { isPlaced: placed.isPlaced };
	});

export const CloseViewPaneCommand = command("close-view-pane")
	.public()
	.input(z.object({ paneId: z.string().min(1), tabId: z.string().min(1).nullable() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ paneId, tabId }, { send, emit, ...injects }) => {
		const left =
			tabId === null
				? null
				: await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
						send(PlacesRemoveFromSplitCommand, { at, tabId }),
					);

		if (left?.isMember !== true) {
			await send(ClosePaneCommand, { id: paneId });
		}
	});

export const ResizeSplitCommand = command("resize-split")
	.public()
	.input(
		z.object({
			branchId: z.string().min(1),
			at: z.number().int().nonnegative(),
			share: z.number().positive(),
		}),
	)
	.idempotencyKey(Repeatable)
	.handle(async ({ branchId, at: edge, share }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesResizeSplitCommand, { at, branchId, edge, share }),
		);
	});

export const RereadShownSplitSubscriber = subscriber(TabsSettledEvent).handle((_input, { invalidate }) => {
	invalidate(ShownSplitQuery);
});

export const RereadShownSplitForCoreSubscriber = subscriber(StudioCoreChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ShownSplitQuery);
});
