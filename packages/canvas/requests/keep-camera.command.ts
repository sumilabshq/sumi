import { z } from "zod";
import { command } from "@widgetarium/core/mediator";
import { CameraSchema } from "../schema/camera.schema.js";

export const KeepCameraCommand = command("canvas/keep-camera")
	.input(z.object({ camera: CameraSchema }))
	.idempotencyKey("none");
