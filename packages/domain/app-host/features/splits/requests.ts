import { z } from "zod";
import { Repeatable, command, query, subscriber } from "@widgetarium/data-framework";
import {
	PlaceInViewCommand as PlacesPlaceInViewCommand,
	RemoveFromSplitCommand as PlacesRemoveFromSplitCommand,
	ResizeSplitCommand as PlacesResizeSplitCommand,
	ShownSplitQuery as PlacesShownSplitQuery,
} from "@widgetarium/places";
import { ClosePaneCommand } from "@widgetarium/layout";
import { StudioWindowGateway } from "../../gateways/studio-window/studio-window.gateway.js";
import { StudioCoreChangedEvent, TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { SHOWING_PARTS } from "../../shared/lib/tab-showing/showing-parts.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { ShownSplitSchema, SplitPlacingSchema } from "../../shared/schema/split.schema.js";

export const ShownSplitQuery = query("shown-split")
	.output(ShownSplitSchema)
	.inject({ studioWindow: StudioWindowGateway })
	.handle(async (_input, { send, studioWindow }) =>
		send(PlacesShownSplitQuery, { window: studioWindow.windowLabel() }),
	);

export const PlaceInViewCommand = command("place-in-view")
	.input(SplitPlacingSchema)
	.output(z.object({ isPlaced: z.boolean() }))
	.idempotencyKey(Repeatable)
	.inject(SHOWING_PARTS)
	.emits(TabsSettledEvent)
	.handle(async (placing, { send, emit, ...parts }) => {
		const placed = await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesPlaceInViewCommand, { at, ...placing }),
		);
		return { isPlaced: placed.isPlaced };
	});

export const CloseViewPaneCommand = command("close-view-pane")
	.input(z.object({ paneId: z.string().min(1), tabId: z.string().min(1).nullable() }))
	.idempotencyKey(Repeatable)
	.inject(SHOWING_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ paneId, tabId }, { send, emit, ...parts }) => {
		const left =
			tabId === null
				? null
				: await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
						send(PlacesRemoveFromSplitCommand, { at, tabId }),
					);

		if (left?.isMember !== true) {
			await send(ClosePaneCommand, { id: paneId });
		}
	});

export const ResizeSplitCommand = command("resize-split")
	.input(
		z.object({
			branchId: z.string().min(1),
			at: z.number().int().nonnegative(),
			share: z.number().positive(),
		}),
	)
	.idempotencyKey(Repeatable)
	.inject(SHOWING_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ branchId, at: edge, share }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesResizeSplitCommand, { at, branchId, edge, share }),
		);
	});

export const RereadShownSplitSubscriber = subscriber(TabsSettledEvent).handle((_input, { invalidate }) => {
	invalidate(ShownSplitQuery);
});

export const RereadShownSplitForCoreSubscriber = subscriber(StudioCoreChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ShownSplitQuery);
});
