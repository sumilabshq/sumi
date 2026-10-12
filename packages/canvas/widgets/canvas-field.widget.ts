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
	getDesign: IQuery.output(ReadDesignSchema.nullable().default(null)),
	getDrawing: IQuery.output(DrawingKitSchema.nullable().default(null)),
	getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
	getDocs: IQuery.input(PageInputSchema).output(PageOf(CanvasDocSchema)),
	getMode: IQuery.output(CanvasModeSchema.default("hand")),
	getRenderer: IQuery.output(PageRendererSchema.default("html")),
	getCamera: IQuery.output(CameraSchema.nullable().default(null)),
	moveCamera: ICommand.input(CameraAskSchema),
	getSelection: IQuery.output(SelectionSchema.nullable().default(null)),
	select: ICommand.input(SelectAskSchema),
	getFocusedWidget: IQuery.output(z.string().nullable().default(null)),
	focusWidget: ICommand.input(WidgetFocusSchema),
});

export const CanvasFieldWidget = widget().inject(canvasFieldInject).render(CanvasFieldView);
