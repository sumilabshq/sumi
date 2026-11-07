import { z } from "zod";

export const HeldFileSchema = z.object({
	path: z.string(),
	identity: z.string(),
});

export type HeldFile = z.infer<typeof HeldFileSchema>;
