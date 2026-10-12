import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { LayerDropSchema } from "../../schemas/layer-move.schema.js";
import type { LayerDrop } from "../../schemas/layer-move.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";
import { layerMoveTo } from "./layer-moves.js";

const NOT_MOVABLE = "That place is outside the page's own code, so nothing was moved.";

export class MoveLayerCommand extends ICommand.input(LayerDropSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ widget, dragged, parent, before }: LayerDrop): Promise<void> {
		const move = layerMoveTo(dragged, parent, before);
		if (!move) throw new Error(NOT_MOVABLE);
		await canvasSourceIn(this.ports).design.moveLayer(widget, move);
	}
}
