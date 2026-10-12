import { z } from "zod";
import { ICommand, IQuery, ISlot, widget } from "@widgetarium/core";
import { AgentLookSchema } from "../schemas/agent-look.schema.js";
import { CanvasPagesSchema } from "../schemas/canvas-page.schema.js";
import {
	CanvasModeSchema,
	ModeAskSchema,
	PageAskSchema,
	PageRendererSchema,
	RendererAskSchema,
} from "../schemas/canvas-view.schema.js";
import { ReadDesignSchema } from "../schemas/design.schema.js";
import { DrawingKitSchema } from "../schemas/drawing.schema.js";
import { FramePicturesSchema } from "../schemas/frame-picture.schema.js";
import { PhotosSchema } from "../schemas/photo.schema.js";
import { CanvasTopBar } from "../ui/canvas-top-bar/canvas-top-bar.js";

export const CanvasTopBarWidget = widget()
	.inject({
		getDesign: IQuery.output(ReadDesignSchema.nullable().default(null)),
		getDrawing: IQuery.output(DrawingKitSchema.nullable().default(null)),
		getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
		showPage: ICommand.input(PageAskSchema),
		getIsLayersOpen: IQuery.output(z.boolean().default(false)),
		toggleLayers: ICommand,
		getMode: IQuery.output(CanvasModeSchema.default("hand")),
		setMode: ICommand.input(ModeAskSchema),
		addPhotos: ICommand.input(PhotosSchema),
		getRenderer: IQuery.output(PageRendererSchema.default("html")),
		chooseRenderer: ICommand.input(RendererAskSchema),
		getFramePictures: IQuery.output(FramePicturesSchema.default({ shown: {}, waiting: 0 })),
		getAgentLook: IQuery.output(AgentLookSchema.nullable().default(null)),
		returnToView: ICommand,
		start: ISlot.array(),
		end: ISlot.array(),
	})
	.render(CanvasTopBar);

export default CanvasTopBarWidget;
