import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { PageRendererSchema } from "../schema/canvas-view.schema.js";

export const RendererSwitchQuery = query("canvas/renderer-switch").output(
	z.object({ isShown: z.boolean(), renderer: PageRendererSchema }),
);
