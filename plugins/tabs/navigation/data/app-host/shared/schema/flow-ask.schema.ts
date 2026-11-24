import { z } from "zod";

export const FlowIdAskSchema = z.object({
	flowId: z.string().min(1),
});
