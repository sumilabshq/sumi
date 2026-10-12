import { ICommand } from "@widgetarium/core";
import { LayerDropSchema } from "../../schemas/layer-move.schema.js";
import type { LayerDrop } from "../../schemas/layer-move.schema.js";
import type { DesignSource } from "../design/design-source.js";
import { layerMoveTo } from "./layer-moves.js";

const NOT_MOVABLE = "That place is outside the page's own code, so nothing was moved.";

export class MoveLayerCommand extends ICommand.input(LayerDropSchema) {
	constructor(private readonly source: DesignSource) {
		super();
	}

	async run({ widget, dragged, parent, before }: LayerDrop): Promise<void> {
		const move = layerMoveTo(dragged, parent, before);
		if (!move) throw new Error(NOT_MOVABLE);
		await this.source.moveLayer(widget, move);
	}
}
