import { z } from "zod";

export const SidebarSchema = z.object({
	isOpen: z.boolean(),
	px: z.number(),
	leastPx: z.number(),
	keptBesidePx: z.number(),
});

export const SidebarResizeSchema = z.object({
	px: z.number(),
	roomPx: z.number(),
});
