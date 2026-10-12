import { z } from "zod";
import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../ports/design-source.port.js";
import { DesignReads } from "../design/design-reads.js";
import { pagesNow } from "../pages/pages-now.js";
import { CanvasStore } from "../view/canvas-store.js";
import { layerMoveTo } from "./layer-moves.js";
import { shownScreenOf } from "./shown-screen.js";

export const MoveLayerCommand = command("canvas/move-layer")
	.input(z.object({ dragged: z.string(), parent: z.string(), before: z.string().nullable() }))
	.idempotencyKey("per-call");

const NOT_MOVABLE = "That place is outside the page's own code, so nothing was moved.";
const NOT_A_PAGE = "This screen is not drawn by a page widget, so its layers cannot be moved.";

export class MoveLayerCommandHandler extends handlerOf(MoveLayerCommand) {
	private readonly designReads = inject(DesignReads);
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);

	override async handle({ dragged, parent, before }: InputOf<typeof MoveLayerCommand>): Promise<void> {
		const now = await pagesNow(this.designReads, this.canvasStore);
		const widget = shownScreenOf(now)?.picture?.widget;
		if (!widget) throw new Error(NOT_A_PAGE);
		const move = layerMoveTo(dragged, parent, before);
		if (!move) throw new Error(NOT_MOVABLE);
		await this.designSource.moveLayer(widget, move);
		this.designReads.changed(now.app);
	}
}
