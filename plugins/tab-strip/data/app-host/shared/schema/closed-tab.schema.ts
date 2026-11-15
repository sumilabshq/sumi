import { z } from "zod";
import { TabAppSchema, TabArtSchema } from "./app-tab.schema.js";

export const ClosedTabRowSchema = z.object({
	tabId: z.string().min(1),
	title: z.string(),
	app: TabAppSchema,
	address: z.string(),
	icon: TabArtSchema,
	favicon: z.string().nullable(),
});

export type ClosedTabRow = z.infer<typeof ClosedTabRowSchema>;

export const ClosedTabsSchema = z.object({ tabs: z.array(ClosedTabRowSchema).readonly() });

export const ClosedTabIdSchema = z.object({ tabId: z.string().min(1) });
