import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { navigation } from "@widgetarium/navigation/contract";
import { studioCoreChanged } from "../../gateways/core-changes/core-changes.events.js";
import { panesChanged } from "../../shared/events/panes.events.js";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { seatOf } from "../../shared/lib/window-seat.js";
import { PaneBoardSchema, PanePlacementSchema, PlacementPreviewSchema } from "../../shared/schema/pane-board.schema.js";

export const paneTree = query()
	.public()
	.output(PaneBoardSchema)
	.handle((_input, { send, studioWindow }) => send(navigation.panes.board, { seat: seatOf(studioWindow) }));

export const placementPreview = query()
	.public()
	.input(PanePlacementSchema.nullable())
	.output(PlacementPreviewSchema.nullable())
	.handle((placement, { send, studioWindow }) =>
		send(navigation.panes.placementPreview, { seat: seatOf(studioWindow), placement }),
	);

export const place = command()
	.public()
	.input(PanePlacementSchema)
	.idempotencyKey(Repeatable)
	.handle(async (placement, { send, emit, studioWindow }) => {
		await send(navigation.panes.place, { seat: seatOf(studioWindow), placement });
		emit(panesChanged);
	});

export const close = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, studioWindow }) => {
		await send(navigation.panes.close, { seat: seatOf(studioWindow), id });
		emit(panesChanged);
	});

export const resizeSplit = command()
	.public()
	.input(
		z.object({
			splitId: z.string(),
			at: z.number().int().nonnegative(),
			share: z.number().nonnegative(),
		}),
	)
	.idempotencyKey(Repeatable)
	.handle(async (asked, { send, emit, studioWindow }) => {
		await send(navigation.panes.resizeSplit, { seat: seatOf(studioWindow), ...asked });
		emit(panesChanged);
	});

export const aim = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, studioWindow }) => {
		await send(navigation.panes.aim, { seat: seatOf(studioWindow), id });
		emit(panesChanged);
	});

export const rereadPanes = subscriber(panesChanged).handle((_input, { invalidate }) => {
	invalidate(paneTree);
	invalidate(placementPreview);
});

export const rereadPanesForTabs = subscriber(tabsSettled).handle((_input, { invalidate }) => {
	invalidate(paneTree);
	invalidate(placementPreview);
});

export const rereadPanesForCore = subscriber(studioCoreChanged).handle((_input, { invalidate }) => {
	invalidate(paneTree);
	invalidate(placementPreview);
});
