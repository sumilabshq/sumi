import { z } from "zod";
import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { navigation } from "@widgetarium/navigation/contract";
import { layout } from "@widgetarium/layout/contract";
import { studioCoreChanged } from "../../gateways/core-changes/core-changes.events.js";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { ShownSplitSchema, SplitPlacingSchema } from "../../shared/schema/split.schema.js";

const LAST_PANE = 'pane "{id}" stays: closing it would leave the board empty';

export const shown = query()
	.public()
	.output(ShownSplitSchema)
	.handle(async (_input, { send, studioWindow }) => send(navigation.splits.shown, { window: studioWindow.placesWindow() }));

export const placeInView = command()
	.public()
	.input(SplitPlacingSchema)
	.output(z.object({ isPlaced: z.boolean() }))
	.idempotencyKey(Repeatable)
	.handle(async (placing, { send, emit, ...injects }) => {
		const placed = await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.splits.placeInView, { at, ...placing }),
		);
		return { isPlaced: placed.isPlaced };
	});

export const closeViewPane = command()
	.public()
	.input(z.object({ paneId: z.string().min(1), tabId: z.string().min(1).nullable() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ paneId, tabId }, { send, emit, ...injects }) => {
		const board = await send(layout.panes.paneTree);

		if (!board.closableIds.includes(paneId)) {
			return refuse(LAST_PANE.replace("{id}", paneId));
		}

		const left =
			tabId === null
				? null
				: await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
						send(navigation.splits.remove, { at, tabId }),
					);

		if (left?.isMember !== true) {
			await send(layout.panes.close, { id: paneId });
		}
	});

export const unsplit = command()
	.public()
	.input(z.object({ tabIds: z.array(z.string().min(1)).min(1).readonly() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ tabIds }, { send, emit, ...injects }) => {
		for (const tabId of tabIds) {
			await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
				send(navigation.splits.remove, { at, tabId }),
			);
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
			send(navigation.splits.resize, { at, branchId, edge, share }),
		);
	});

export const rereadShown = subscriber(tabsSettled).handle((_input, { invalidate }) => {
	invalidate(shown);
});

export const rereadShownForCore = subscriber(studioCoreChanged).handle((_input, { invalidate }) => {
	invalidate(shown);
});
