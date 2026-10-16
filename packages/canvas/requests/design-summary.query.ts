import { z } from "zod";
import { query } from "@widgetarium/core/mediator";

export const DesignSummaryQuery = query("canvas/design-summary").output(
	z.object({ app: z.string(), said: z.string() }),
);
