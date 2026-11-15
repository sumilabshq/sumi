import { z } from "zod";

export const TabToShowSchema = z.object({
	id: z.string().min(1),
	paneId: z.string().min(1).nullable().default(null),
	isFollowingFocus: z.boolean().default(false),
});

export type TabToShow = z.input<typeof TabToShowSchema>;
