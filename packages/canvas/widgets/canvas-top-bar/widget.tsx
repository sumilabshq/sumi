import { createElement as h } from "react";
import { z } from "zod";
import { ICommand, IQuery, ISlot, createWidget, defineLayout, defineMetadata } from "@widgetarium/core";
import type { PropsOf } from "@widgetarium/core";
import { AgentLookSchema } from "../../schemas/agent-look.schema.js";
import { CanvasPagesSchema } from "../../schemas/canvas-page.schema.js";
import {
	CanvasModeSchema,
	ModeAskSchema,
	PageAskSchema,
	PageRendererSchema,
	RendererAskSchema,
} from "../../schemas/canvas-view.schema.js";
import { ReadDesignSchema } from "../../schemas/design.schema.js";
import { DrawingKitSchema } from "../../schemas/drawing.schema.js";
import { FramePicturesSchema } from "../../schemas/frame-picture.schema.js";
import { PhotosSchema } from "../../schemas/photo.schema.js";
import { CanvasTopBar } from "./ui/canvas-top-bar.js";

const CanvasTopBarWidget = createWidget({
	inject: {
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
	},
	draw: (ports) => {
		const { getDesign: design, getDrawing: drawing, getPages: pages } = ports;
		if (!design || !drawing || !pages) return null;
		return <CanvasTopBar ports={ports} design={design} drawing={drawing} pages={pages} />;
	},
});

export type CanvasTopBarPorts = PropsOf<typeof CanvasTopBarWidget>;

export const metadata = defineMetadata(CanvasTopBarWidget, {
	title: "Canvas top bar",
	description: "The canvas's top bar: the app, its tabs, the tools, the renderer switch and the way back.",
	keywords: ["design", "canvas", "top bar", "tabs", "tools", "renderer", "studio"],
	props: {
		getDesign: { label: "Design", hint: "The app's name and how many screens it draws." },
		getDrawing: { label: "Drawing", hint: "Whether this host can draw pages on the GPU." },
		getPages: { label: "Tabs", hint: "The tabs offered and the one shown." },
		showPage: { label: "Show a page", hint: "Shows one tab." },
		getIsLayersOpen: { label: "Layers open", hint: "Pressed while the layers stand beside the canvas." },
		toggleLayers: { label: "Layers", hint: "Shows or hides the layers." },
		getMode: { label: "Mode", hint: "Whether a press picks a part or moves the canvas." },
		setMode: { label: "Set the mode", hint: "Switches between picking and moving." },
		addPhotos: { label: "Add photos", hint: "Adds reference photos picked from disk." },
		getRenderer: { label: "Renderer", hint: "Whether pages are drawn as HTML or on the GPU." },
		chooseRenderer: { label: "Choose a renderer", hint: "Draws pages as HTML or on the GPU." },
		getFramePictures: { label: "Frame pictures", hint: "How many pictures are still being made." },
		getAgentLook: { label: "Agent look", hint: "The page the assistant is looking at." },
		returnToView: { label: "Back to view", hint: "Leaves the canvas for the app." },
		start: { label: "Left corner", hint: "Drawn at the start of the bar." },
		end: { label: "Right corner", hint: "Drawn at the end of the bar." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default CanvasTopBarWidget;
