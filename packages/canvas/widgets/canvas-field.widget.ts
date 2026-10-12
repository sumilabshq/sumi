import { z } from "zod";
import { ICommand, IQuery, PageInputSchema, PageOf, inject, widget } from "@widgetarium/core";
import { CameraAskSchema, CameraSchema } from "../schemas/camera.schema.js";
import { CanvasPagesSchema } from "../schemas/canvas-page.schema.js";
import { CanvasModeSchema, PageRendererSchema, WidgetFocusSchema } from "../schemas/canvas-view.schema.js";
import { ReadDesignSchema } from "../schemas/design.schema.js";
import { CanvasDocSchema } from "../schemas/doc.schema.js";
import { DrawingKitSchema } from "../schemas/drawing.schema.js";
import { SelectAskSchema, SelectionSchema } from "../schemas/selection.schema.js";
import { CanvasFieldView } from "../ui/canvas-view/canvas-view.js";

export const canvasFieldInject = inject({
	designQuery: IQuery.output(ReadDesignSchema.nullable().default(null)),
	drawingQuery: IQuery.output(DrawingKitSchema.nullable().default(null)),
	pagesQuery: IQuery.output(CanvasPagesSchema.nullable().default(null)),
	docsQuery: IQuery.input(PageInputSchema).output(PageOf(CanvasDocSchema)),
	modeQuery: IQuery.output(CanvasModeSchema.default("hand")),
	rendererQuery: IQuery.output(PageRendererSchema.default("html")),
	cameraQuery: IQuery.output(CameraSchema.nullable().default(null)),
	moveCameraCommand: ICommand.input(CameraAskSchema),
	selectionQuery: IQuery.output(SelectionSchema.nullable().default(null)),
	selectCommand: ICommand.input(SelectAskSchema),
	focusedWidgetQuery: IQuery.output(z.string().nullable().default(null)),
	focusWidgetCommand: ICommand.input(WidgetFocusSchema),
});

export const CanvasFieldWidget = widget().inject(canvasFieldInject).render(CanvasFieldView);
