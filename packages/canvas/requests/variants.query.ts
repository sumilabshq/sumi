import { z } from "zod";
import { query } from "@widgetarium/core/mediator";

export const VariantsQuery = query("canvas/variants").output(
	z.object({
		isShown: z.boolean(),
		shown: z.string(),
		items: z.array(z.object({ value: z.string(), label: z.string() })),
	}),
);
