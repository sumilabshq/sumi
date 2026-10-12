import { z } from "zod";
import { ICommand, IQuery, ISlot, PageInputSchema, PageOf, widget } from "@widgetarium/core";
import { CameraAskSchema, CameraSchema } from "../schemas/camera.schema.js";
import { CanvasPagesSchema } from "../schemas/canvas-page.schema.js";
import {
	CanvasModeSchema,
	PageRendererSchema,
	VariantPickSchema,
	WidgetFocusSchema,
} from "../schemas/canvas-view.schema.js";
import { ReadDesignSchema } from "../schemas/design.schema.js";
import { CanvasDocSchema } from "../schemas/doc.schema.js";
import { DrawingKitSchema } from "../schemas/drawing.schema.js";
import { FramePicturesSchema, PictureAsksSchema } from "../schemas/frame-picture.schema.js";
import { FrameSizeSchema } from "../schemas/frame-size.schema.js";
import { PhotosSchema } from "../schemas/photo.schema.js";
import { SelectAskSchema, SelectionSchema } from "../schemas/selection.schema.js";
import { CanvasView } from "../ui/canvas-view/canvas-view.js";

export const CanvasFieldWidget = widget()
	.inject({
		getDesign: IQuery.output(ReadDesignSchema.nullable().default(null)),
		getDrawing: IQuery.output(DrawingKitSchema.nullable().default(null)),
		getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
		getDocs: IQuery.input(PageInputSchema).output(PageOf(CanvasDocSchema)),
		addPhotos: ICommand.input(PhotosSchema),
		pickVariant: ICommand.input(VariantPickSchema),
		getFocusedWidget: IQuery.output(z.string().nullable().default(null)),
		focusWidget: ICommand.input(WidgetFocusSchema),
		getMode: IQuery.output(CanvasModeSchema.default("hand")),
		getRenderer: IQuery.output(PageRendererSchema.default("html")),
		getCamera: IQuery.output(CameraSchema.nullable().default(null)),
		moveCamera: ICommand.input(CameraAskSchema),
		getViewport: IQuery.output(FrameSizeSchema.nullable().default(null)),
		getSelection: IQuery.output(SelectionSchema.nullable().default(null)),
		select: ICommand.input(SelectAskSchema),
		getFramePictures: IQuery.output(FramePicturesSchema.default({ shown: {}, waiting: 0 })),
		askForPictures: ICommand.input(PictureAsksSchema),
		top: ISlot.array(),
		start: ISlot.array(),
		end: ISlot.array(),
		status: ISlot.array(),
	})
	.render(CanvasView);
