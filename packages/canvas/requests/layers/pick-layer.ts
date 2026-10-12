import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignReads } from "../design/design-reads.js";
import { pagesNow } from "../pages/pages-now.js";
import { CanvasStore } from "../view/canvas-store.js";
import { openedTo } from "./opened-to.js";
import { shownScreenOf } from "./shown-screen.js";

export const PickLayerCommand = command("canvas/pick-layer")
	.input(z.object({ id: z.string() }))
	.idempotencyKey("none");

const NOT_A_PAGE = "This screen is not drawn by a page widget, so a layer of it cannot be picked.";

export class PickLayerCommandHandler extends handlerOf(PickLayerCommand) {
	private readonly designReads = inject(DesignReads);
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ id }: InputOf<typeof PickLayerCommand>): Promise<void> {
		const widget = shownScreenOf(await pagesNow(this.designReads, this.canvasStore))?.picture?.widget;
		if (!widget) throw new Error(NOT_A_PAGE);
		const moment = this.canvasStore.now();
		const selection = moment.selection?.mark === id ? null : { widget, mark: id, spot: null };
		this.canvasStore.change(
			{ selection, closedLayers: openedTo(moment, selection) },
			selection ? `pick ${id}` : "clear the pick",
		);
	}
}
