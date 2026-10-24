import { z } from "zod";

export const SearchWebSchema = z.object({
	text: z.string().trim().min(1),
	heldTabId: z.string().nullable(),
});
