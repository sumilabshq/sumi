import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignReads } from "../../lib/design/design-reads.js";
import { pagesStill } from "../../lib/pages/pages-still.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { openedTo } from "../../lib/layers/opened-to.js";
import { pickedMarkOf } from "../../lib/layers/picked-mark.js";
import { shownScreenOf } from "../../lib/layers/shown-screen.js";
import { PickLayerCommand } from "../../requests/pick-layer.command.js";

const NOT_A_PAGE = "This screen is not drawn by a page widget, so a layer of it cannot be picked.";

export class PickLayerCommandHandler extends handlerOf(PickLayerCommand) {
	private readonly designReads = this.inject(DesignReads);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ id }: InputOf<typeof PickLayerCommand>): Promise<void> {
		const now = await pagesStill(this.designReads, this.canvasStore, `pick ${id}`);
		if (!now) return;
		const widget = shownScreenOf(now)?.picture?.widget;
		if (!widget) throw new Error(NOT_A_PAGE);
		const moment = this.canvasStore.now();
		const selection = pickedMarkOf(moment, [widget]) === id ? null : { widget, mark: id, spot: null };
		this.canvasStore.change(
			{ selection, closedLayers: openedTo(moment, selection) },
			selection ? `pick ${id}` : "clear the pick",
		);
	}
}
