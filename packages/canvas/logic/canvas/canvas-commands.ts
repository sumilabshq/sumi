import { defineCommandMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import type { CommandMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import { NoFieldsSchema } from "../../schemas/canvas-fields.schema.js";
import { StopJobCommand } from "../jobs/stop-job.command.js";
import { PickLookCommand } from "../look/pick-look.command.js";
import { AddPhotosCommand } from "../photos/add-photos.command.js";
import { MoveLayerCommand } from "../layers/move-layer.command.js";
import { ToggleLayersCommand } from "../layers/toggle-layers.command.js";
import { ShowPageCommand } from "../pages/show-page.command.js";
import { PickVariantCommand } from "../pages/pick-variant.command.js";
import { FocusWidgetCommand } from "../pages/focus-widget.command.js";
import { ReturnToViewCommand } from "../pages/return-to-view.command.js";
import { SetModeCommand } from "../view/set-mode.command.js";
import { ChooseRendererCommand } from "../view/choose-renderer.command.js";
import { MoveCameraCommand } from "../camera/move-camera.command.js";
import { SelectCommand } from "../selection/select.command.js";
import { AskForPicturesCommand } from "../pictures/ask-for-pictures.command.js";

const RESOURCE = "Apps";

export const CANVAS_COMMANDS: readonly CommandMetadata[] = [
	defineCommandMetadata(StopJobCommand, {
		id: "@canvas/stop-job",
		title: "Pause a job",
		resource: RESOURCE,
		description: "Pauses a running job of the assistant.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(PickLookCommand, {
		id: "@canvas/pick-look",
		title: "Pick a look",
		resource: RESOURCE,
		description: "Picks one option of a setting of the app's look.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(AddPhotosCommand, {
		id: "@canvas/add-photos",
		title: "Add photos",
		resource: RESOURCE,
		description: "Adds reference photos to the app's design.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(MoveLayerCommand, {
		id: "@canvas/move-layer",
		title: "Move a layer",
		resource: RESOURCE,
		description: "Moves a part of a page to another place in the page's code.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(ToggleLayersCommand, {
		id: "@canvas/toggle-layers",
		title: "Layers",
		resource: RESOURCE,
		description: "Shows or hides the layers of the shown page.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(ShowPageCommand, {
		id: "@canvas/show-page",
		title: "Show a page",
		resource: RESOURCE,
		description: "Shows one tab of the canvas.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(PickVariantCommand, {
		id: "@canvas/pick-variant",
		title: "Pick a variant",
		resource: RESOURCE,
		description: "Shows one variant of a page the design drew more than once.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(FocusWidgetCommand, {
		id: "@canvas/focus-widget",
		title: "Open a widget",
		resource: RESOURCE,
		description: "Opens a widget on the components page, or forgets the one opened.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(ReturnToViewCommand, {
		id: "@canvas/return-to-view",
		title: "Back to view",
		resource: RESOURCE,
		description: "Leaves the canvas for the app on the page shown.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(SetModeCommand, {
		id: "@canvas/set-mode",
		title: "Mode",
		resource: RESOURCE,
		description: "Makes a press pick a part of a page or move the canvas.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(ChooseRendererCommand, {
		id: "@canvas/choose-renderer",
		title: "Renderer",
		resource: RESOURCE,
		description: "Draws pages as HTML or on the GPU.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(MoveCameraCommand, {
		id: "@canvas/move-camera",
		title: "Move the camera",
		resource: RESOURCE,
		description: "Keeps where the canvas looks, or lets it fit the pages again.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(SelectCommand, {
		id: "@canvas/select",
		title: "Pick a part",
		resource: RESOURCE,
		description: "Picks a part of a page, or clears the pick.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
	defineCommandMetadata(AskForPicturesCommand, {
		id: "@canvas/ask-for-pictures",
		title: "Picture frames",
		resource: RESOURCE,
		description: "Asks for pictures standing in for frames, made while the canvas is still.",
		fields: NoFieldsSchema,
		consent: "free",
	}),
];
