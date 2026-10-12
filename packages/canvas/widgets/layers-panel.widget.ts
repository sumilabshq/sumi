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
	designQuery: IQuery.output(ReadDesignSchema.nullable().default(null)),
	drawingQuery: IQuery.output(DrawingKitSchema.nullable().default(null)),
	pagesQuery: IQuery.output(CanvasPagesSchema.nullable().default(null)),
	isLayersOpenQuery: IQuery.output(z.boolean().default(false)),
	modeQuery: IQuery.output(CanvasModeSchema.default("hand")),
	selectionQuery: IQuery.output(SelectionSchema.nullable().default(null)),
	selectCommand: ICommand.input(SelectAskSchema),
	moveLayerCommand: ICommand.input(LayerDropSchema),
});

export const LayersPanelWidget = widget().inject(layersPanelInject).render(LayersPanelView);
