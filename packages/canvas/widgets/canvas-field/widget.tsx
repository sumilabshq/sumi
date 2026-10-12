import { createElement as h } from "react";
import { z } from "zod";
import {
	ICommand,
	IQuery,
	ISlot,
	PageInputSchema,
	PageOf,
	createWidget,
	defineLayout,
	defineMetadata,
} from "@widgetarium/core";
import type { PropsOf } from "@widgetarium/core";
import { CameraAskSchema, CameraSchema } from "../../schemas/camera.schema.js";
import { CanvasPagesSchema } from "../../schemas/canvas-page.schema.js";
import {
	CanvasModeSchema,
	PageRendererSchema,
	VariantPickSchema,
	WidgetFocusSchema,
} from "../../schemas/canvas-view.schema.js";
import { ReadDesignSchema } from "../../schemas/design.schema.js";
import { CanvasDocSchema } from "../../schemas/doc.schema.js";
import { DrawingKitSchema } from "../../schemas/drawing.schema.js";
import { FramePicturesSchema, PictureAsksSchema } from "../../schemas/frame-picture.schema.js";
import { FrameSizeSchema } from "../../schemas/frame-size.schema.js";
import { JobSchema } from "../../schemas/job.schema.js";
import { PhotosSchema } from "../../schemas/photo.schema.js";
import { SelectAskSchema, SelectionSchema } from "../../schemas/selection.schema.js";
import { CanvasView } from "./ui/canvas-view.js";

const CanvasField = createWidget({
	inject: {
		getDesign: IQuery.output(ReadDesignSchema.nullable().default(null)),
		getDrawing: IQuery.output(DrawingKitSchema.nullable().default(null)),
		getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
		getDocs: IQuery.input(PageInputSchema).output(PageOf(CanvasDocSchema)),
		getJobs: IQuery.input(PageInputSchema).output(PageOf(JobSchema)),
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
	},
	draw: (ports) => <CanvasView ports={ports} />,
});

export type CanvasFieldPorts = PropsOf<typeof CanvasField>;

export const metadata = defineMetadata(CanvasField, {
	title: "Canvas field",
	description: "An app's pages, states, references and widgets laid out on a field that pans and zooms.",
	keywords: ["design", "canvas", "pages", "frames", "states", "references", "zoom", "pan"],
	props: {
		getDesign: { label: "Design", hint: "Every page, state, reference and widget the design draws." },
		getDrawing: { label: "Drawing", hint: "The widgets and the host the pages are drawn with." },
		getPages: { label: "Tabs", hint: "The page shown and the screens it draws." },
		getDocs: { label: "Docs", hint: "The spec and the documents written for the app." },
		getJobs: { label: "Jobs", hint: "The assistant's jobs, for a page being drawn." },
		addPhotos: { label: "Add photos", hint: "Adds photos dropped or pasted on the field." },
		pickVariant: { label: "Pick a variant", hint: "Shows another variant of a page." },
		getFocusedWidget: { label: "Focused widget", hint: "The widget the field flies to." },
		focusWidget: { label: "Open a widget", hint: "Flies to a widget, or forgets it once there." },
		getMode: { label: "Mode", hint: "Whether a press picks a part or moves the field." },
		getRenderer: { label: "Renderer", hint: "Whether pages are drawn as HTML or on the GPU." },
		getCamera: { label: "Camera", hint: "Where the field looks; none while it fits the pages." },
		moveCamera: { label: "Move the camera", hint: "Keeps where the field looks." },
		getViewport: { label: "Viewport", hint: "The room the field has on screen." },
		getSelection: { label: "Selection", hint: "The part of a page picked." },
		select: { label: "Pick a part", hint: "Picks a part of a page, or clears the pick." },
		getFramePictures: { label: "Frame pictures", hint: "Pictures standing in for frames." },
		askForPictures: { label: "Picture frames", hint: "Asks for pictures of frames drawn live." },
		top: { label: "Top", hint: "Drawn over the top edge of the field." },
		start: { label: "Start side", hint: "Drawn over the left side of the field." },
		end: { label: "End side", hint: "Drawn over the right side of the field." },
		status: { label: "Status", hint: "Drawn over the bottom of the field." },
	},
});

export const layout = defineLayout({ role: "layout", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default CanvasField;
