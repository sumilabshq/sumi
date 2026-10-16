import { z } from "zod";
import { command } from "@widgetarium/core/mediator";
import { PageRendererSchema } from "../schema/canvas-view.schema.js";

export const ChooseRendererCommand = command("canvas/choose-renderer")
	.input(z.object({ renderer: PageRendererSchema }))
	.idempotencyKey("none");
