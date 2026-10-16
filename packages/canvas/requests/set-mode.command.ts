import { z } from "zod";
import { command } from "@widgetarium/core/mediator";
import { CanvasModeSchema } from "../schema/canvas-view.schema.js";

export const SetModeCommand = command("canvas/set-mode")
	.input(z.object({ mode: CanvasModeSchema }))
	.idempotencyKey("none");
