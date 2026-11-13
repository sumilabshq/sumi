import { z } from "zod";

export const ToolLabelSchema = z.object({
	kind: z.enum(["search", "read", "edit", "run", "other"]),
	running: z.string().min(1),
	done: z.string().min(1),
	shows: z.string().min(1).optional(),
});

export type ToolLabel = z.infer<typeof ToolLabelSchema>;
