import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { pagesStill } from "../../lib/pages/pages-still.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { layerMoveTo } from "../../lib/layers/layer-moves.js";
import { shownScreenOf } from "../../lib/layers/shown-screen.js";
import { MoveLayerCommand } from "../../requests/move-layer.command.js";

const NOT_MOVABLE = "That place is outside the page's own code, so nothing was moved.";

const NOT_A_PAGE = "This screen is not drawn by a page widget, so its layers cannot be moved.";

export class MoveLayerCommandHandler extends handlerOf(MoveLayerCommand) {
	private readonly designReads = this.inject(DesignReads);
	private readonly designSource = this.inject(DesignSource);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ dragged, parent, before }: InputOf<typeof MoveLayerCommand>): Promise<void> {
		const now = await pagesStill(this.designReads, this.canvasStore, `move ${dragged}`);
		if (!now) return;
		const widget = shownScreenOf(now)?.picture?.widget;
		if (!widget) throw new Error(NOT_A_PAGE);
		const move = layerMoveTo(dragged, parent, before);
		if (!move) throw new Error(NOT_MOVABLE);
		await this.designSource.moveLayer(widget, move);
		this.designReads.changed(now.app);
	}
}
