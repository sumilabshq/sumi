import { z } from "zod";
import { Repeatable, command, query, refuse } from "@widgetarium/core/requests";
import { PaneTreeStore } from "../../shared/lib/pane-tree-store.js";
import { PaneSideSchema, PaneTreeSchema, PaneViewSchema } from "../../shared/schema/pane-tree.schema.js";

const NO_PANE = 'no pane "{id}" stands on the board';

export const PaneTreeQuery = query("layout/pane-tree")
	.output(PaneTreeSchema)
	.settlesNow()
	.inject({ paneTreeStore: PaneTreeStore })
	.watch((_input, { paneTreeStore }, changed) => paneTreeStore.watch(changed))
	.handle((_input, { paneTreeStore }) => paneTreeStore.now());

export const PlacePaneCommand = command("layout/place-pane")
	.input(
		z.object({
			view: PaneViewSchema,
			targetId: z.string().nullable(),
			side: PaneSideSchema,
		}),
	)
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery])
	.inject({ paneTreeStore: PaneTreeStore })
	.handle(({ view, targetId, side }, { paneTreeStore }) => {
		if (targetId !== null && !paneTreeStore.hasPane(targetId)) {
			return refuse(NO_PANE.replace("{id}", targetId));
		}

		paneTreeStore.place(view, {
			targetId,
			side,
		});
	});

export const ClosePaneCommand = command("layout/close-pane")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery])
	.inject({ paneTreeStore: PaneTreeStore })
	.handle(({ id }, { paneTreeStore }) => {
		if (!paneTreeStore.hasPane(id)) {
			return refuse(NO_PANE.replace("{id}", id));
		}

		paneTreeStore.close(id);
	});

export const ResizePaneSplitCommand = command("layout/resize-pane-split")
	.input(
		z.object({
			splitId: z.string(),
			at: z.number().int().nonnegative(),
			share: z.number().nonnegative(),
		}),
	)
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery])
	.inject({ paneTreeStore: PaneTreeStore })
	.handle(({ splitId, at, share }, { paneTreeStore }) => {
		paneTreeStore.resize(splitId, at, share);
	});

export const AimPaneCommand = command("layout/aim-pane")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery])
	.inject({ paneTreeStore: PaneTreeStore })
	.handle(({ id }, { paneTreeStore }) => {
		if (!paneTreeStore.hasPane(id)) {
			return refuse(NO_PANE.replace("{id}", id));
		}

		paneTreeStore.aimAt(id);
	});
