import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { CameraSchema } from "../../schema/camera.schema.js";
import { PageRendererSchema } from "../../schema/canvas-view.schema.js";
import { CanvasModeSchema } from "../../schema/canvas-view.schema.js";

export const CameraQuery = query("canvas/camera").output(z.object({ camera: CameraSchema.nullable() }));

export const ChooseRendererCommand = command("canvas/choose-renderer")
	.input(z.object({ renderer: PageRendererSchema }))
	.idempotencyKey(Repeatable);

export const KeepCameraCommand = command("canvas/keep-camera")
	.input(z.object({ camera: CameraSchema }))
	.idempotencyKey(Repeatable);

export const ModeQuery = query("canvas/mode").output(z.object({ mode: CanvasModeSchema }));

export const RendererSwitchQuery = query("canvas/renderer-switch").output(
	z.object({ isShown: z.boolean(), renderer: PageRendererSchema }),
);

export const SetModeCommand = command("canvas/set-mode")
	.input(z.object({ mode: CanvasModeSchema }))
	.idempotencyKey(Repeatable);
