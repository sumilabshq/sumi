import { z } from "zod";

export const MOST_LINK_CHARS = 2048;

export const LinkToOpenSchema = z.object({
	href: z.string().max(MOST_LINK_CHARS),
	opensNew: z.boolean().default(false),
});
