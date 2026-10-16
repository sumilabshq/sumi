import { z } from "zod";
import { query } from "@widgetarium/core/mediator";

export const PageTabsQuery = query("canvas/page-tabs").output(
	z.object({
		leading: z.array(z.string()),
		pages: z.array(z.object({ page: z.string(), isRunning: z.boolean(), isShown: z.boolean() })),
		trailing: z.array(z.string()),
		shown: z.string(),
		shownTab: z.string(),
	}),
);
