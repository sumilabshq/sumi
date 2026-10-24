import { z } from "zod";

export const LookRowSchema = z.object({
	name: z.string(),
	label: z.string(),
	options: z.array(z.string()),
	picked: z.string(),
	isSegmented: z.boolean(),
	suggested: z.string().nullable(),
	isRedrawn: z.boolean(),
});

export type LookRow = z.infer<typeof LookRowSchema>;
