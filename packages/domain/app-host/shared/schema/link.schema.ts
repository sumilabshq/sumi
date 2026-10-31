import { z } from "zod";

export const LinkToOpenSchema = z.object({
	href: z.string(),
	opensNew: z.boolean().default(false),
});
