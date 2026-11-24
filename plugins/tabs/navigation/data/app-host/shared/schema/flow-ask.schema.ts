import { z } from "zod";
import { AppKindSchema } from "./app-tab.schema.js";

export const FlowIdAskSchema = z.object({
	flowId: z.string().min(1),
});

export const FlowTabToOpenSchema = FlowIdAskSchema.extend({
	paneId: z.string().min(1),
	app: AppKindSchema,
	address: z.string().nullable().default(null),
});
