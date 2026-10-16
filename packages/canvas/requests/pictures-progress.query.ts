import { z } from "zod";
import { query } from "@widgetarium/core/mediator";

export const PicturesProgressQuery = query("canvas/pictures-progress").output(
	z.object({ isShown: z.boolean(), said: z.string() }),
);
