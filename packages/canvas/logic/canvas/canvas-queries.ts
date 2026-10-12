import { defineGatewayMetadata } from "@widgetarium/core";
import type { GatewayMetadata } from "@widgetarium/core";
import { NoFieldsSchema } from "../../schemas/canvas-fields.schema.js";
import { DesignQuery } from "../design/design.query.js";
import { DrawingQuery } from "../design/drawing.query.js";
import { DocsQuery } from "../docs/docs.query.js";
import { JobsQuery } from "../jobs/jobs.query.js";
import { LiveJobQuery } from "../jobs/live-job.query.js";
import { LookQuery } from "../look/look.query.js";
import { PagesQuery } from "../pages/pages.query.js";
import { FocusedWidgetQuery } from "../pages/focused-widget.query.js";
import { LayersOpenQuery } from "../layers/layers-open.query.js";
import { ModeQuery } from "../view/mode.query.js";
import { RendererQuery } from "../view/renderer.query.js";
import { CameraQuery } from "../camera/camera.query.js";
import { ViewportQuery } from "../camera/viewport.query.js";
import { SelectionQuery } from "../selection/selection.query.js";
import { FramePicturesQuery } from "../pictures/frame-pictures.query.js";
import { AgentLookQuery } from "../agent/agent-look.query.js";

const RESOURCE = "Apps";

export const CANVAS_QUERIES: readonly GatewayMetadata[] = [
	defineGatewayMetadata(DesignQuery, {
		id: "@canvas/design",
		title: "Design",
		resource: RESOURCE,
		description: "Every page, state, reference and widget the app's design draws.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(DrawingQuery, {
		id: "@canvas/drawing",
		title: "Drawing",
		resource: RESOURCE,
		description: "The widgets and the host the canvas draws the app's pages with.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(DocsQuery, {
		id: "@canvas/docs",
		title: "Docs",
		resource: RESOURCE,
		description: "The spec and the documents written for the app, a page at a time.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(JobsQuery, {
		id: "@canvas/jobs",
		title: "Jobs",
		resource: RESOURCE,
		description: "The assistant's jobs on this app, a page at a time.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(LiveJobQuery, {
		id: "@canvas/live-job",
		title: "Live job",
		resource: RESOURCE,
		description: "What a running job is doing now and what it has spent.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(LookQuery, {
		id: "@canvas/look",
		title: "Look",
		resource: RESOURCE,
		description: "The look of the app: its design system and the settings picked in it.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(PagesQuery, {
		id: "@canvas/pages",
		title: "Canvas pages",
		resource: RESOURCE,
		description: "The tabs the canvas offers and the one it shows.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(FocusedWidgetQuery, {
		id: "@canvas/focused-widget",
		title: "Focused widget",
		resource: RESOURCE,
		description: "The widget the canvas flies to on the components page.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(LayersOpenQuery, {
		id: "@canvas/layers-open",
		title: "Layers open",
		resource: RESOURCE,
		description: "Whether the layers of the shown page stand beside the canvas.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(ModeQuery, {
		id: "@canvas/mode",
		title: "Mode",
		resource: RESOURCE,
		description: "Whether a press picks a part of a page or moves the canvas.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(RendererQuery, {
		id: "@canvas/renderer",
		title: "Renderer",
		resource: RESOURCE,
		description: "Whether pages are drawn as HTML or on the GPU.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(CameraQuery, {
		id: "@canvas/camera",
		title: "Camera",
		resource: RESOURCE,
		description: "Where the canvas looks and how close; none while it fits the pages.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(ViewportQuery, {
		id: "@canvas/viewport",
		title: "Viewport",
		resource: RESOURCE,
		description: "How much room the canvas has on screen.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(SelectionQuery, {
		id: "@canvas/selection",
		title: "Selection",
		resource: RESOURCE,
		description: "The part of a page picked on the canvas.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(FramePicturesQuery, {
		id: "@canvas/frame-pictures",
		title: "Frame pictures",
		resource: RESOURCE,
		description: "The pictures standing in for frames, and how many are still being made.",
		fields: NoFieldsSchema,
	}),
	defineGatewayMetadata(AgentLookQuery, {
		id: "@canvas/agent-look",
		title: "Agent look",
		resource: RESOURCE,
		description: "The page the assistant is looking at in this app.",
		fields: NoFieldsSchema,
	}),
];
