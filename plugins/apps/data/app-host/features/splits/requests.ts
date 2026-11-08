import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { places } from "@widgetarium/places/contract";
import { layout } from "@widgetarium/layout/contract";
import { studioCoreChanged } from "../../gateways/core-changes/core-changes.events.js";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { ShownSplitSchema, SplitPlacingSchema } from "../../shared/schema/split.schema.js";

export const shown = query()
	.public()
	.output(ShownSplitSchema)
	.handle(async (_input, { send, studioWindow }) => send(places.splits.shown, { window: studioWindow.windowLabel() }));

export const placeInView = command()
	.public()
	.input(SplitPlacingSchema)
	.output(z.object({ isPlaced: z.boolean() }))
	.idempotencyKey(Repeatable)
	.handle(async (placing, { send, emit, ...injects }) => {
		const placed = await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.splits.placeInView, { at, ...placing }),
		);
		return { isPlaced: placed.isPlaced };
	});

export const closeViewPane = command()
	.public()
	.input(z.object({ paneId: z.string().min(1), tabId: z.string().min(1).nullable() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ paneId, tabId }, { send, emit, ...injects }) => {
		const left =
			tabId === null
				? null
				: await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
						send(places.splits.remove, { at, tabId }),
					);

		if (left?.isMember !== true) {
			await send(layout.panes.close, { id: paneId });
		}
	});

export const resize = command()
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
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.splits.resize, { at, branchId, edge, share }),
		);
	});

export const rereadShown = subscriber(tabsSettled).handle((_input, { invalidate }) => {
	invalidate(shown);
});

export const rereadShownForCore = subscriber(studioCoreChanged).handle((_input, { invalidate }) => {
	invalidate(shown);
});
