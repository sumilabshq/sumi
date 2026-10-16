import { z } from "zod";
import { query } from "@widgetarium/core/mediator";

export const LayersToggleQuery = query("canvas/layers-toggle").output(
	z.object({ isShown: z.boolean(), isOpen: z.boolean() }),
);
