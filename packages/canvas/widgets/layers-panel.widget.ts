import { z } from "zod";
import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { CanvasPagesSchema } from "../schemas/canvas-page.schema.js";
import { CanvasModeSchema } from "../schemas/canvas-view.schema.js";
import { ReadDesignSchema } from "../schemas/design.schema.js";
import { DrawingKitSchema } from "../schemas/drawing.schema.js";
import { LayerDropSchema } from "../schemas/layer-move.schema.js";
import { SelectAskSchema, SelectionSchema } from "../schemas/selection.schema.js";
import { LayersPanelView } from "../ui/layers-panel/layers-panel-view.js";

export const layersPanelInject = inject({
	getDesign: IQuery.output(ReadDesignSchema.nullable().default(null)),
	getDrawing: IQuery.output(DrawingKitSchema.nullable().default(null)),
	getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
	getIsLayersOpen: IQuery.output(z.boolean().default(false)),
	getMode: IQuery.output(CanvasModeSchema.default("hand")),
	getSelection: IQuery.output(SelectionSchema.nullable().default(null)),
	select: ICommand.input(SelectAskSchema),
	moveLayer: ICommand.input(LayerDropSchema),
});

export const LayersPanelWidget = widget().inject(layersPanelInject).render(LayersPanelView);
