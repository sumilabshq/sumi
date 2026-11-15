import { AuthenticatedGuard, Device, module } from "@widgetarium/data-framework";
import { artboards } from "@sumi/artboards/contract";
import type { CanvasWorkConfig } from "./shared/host/board-rendering.host.js";

export type { AppliedTweak, BoardRendering, CanvasWorkConfig, DrawnBoard, Shot } from "./shared/host/board-rendering.host.js";
export type { Layer } from "./shared/schema/layer.schema.js";

export const canvasWork = module("canvas-work")
	.on(Device)
	.imports(artboards)
	.config<CanvasWorkConfig>()
	.guard(AuthenticatedGuard)
	.provide(({ config }) => ({ rendering: config.rendering }));
