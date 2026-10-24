import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { CameraSchema } from "../../shared/schema/camera.schema.js";
import { CanvasModeSchema } from "../../shared/schema/canvas-view.schema.js";

export const CameraQuery = query("canvas/camera").output(z.object({ camera: CameraSchema.nullable() }));

export const KeepCameraCommand = command("canvas/keep-camera")
	.input(z.object({ camera: CameraSchema }))
	.idempotencyKey(Repeatable);

export const ModeQuery = query("canvas/mode").output(z.object({ mode: CanvasModeSchema }));

export const SetModeCommand = command("canvas/set-mode")
	.input(z.object({ mode: CanvasModeSchema }))
	.idempotencyKey(Repeatable);
