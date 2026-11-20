import { query } from "#module";
import { ReadGuideAskSchema, ViewGuideSchema } from "../../shared/schema/view-work.schema.js";
import { viewGuideOf } from "./lib/view-guide.js";

export const read = query()
	.public()
	.metadata({
		description:
			"Read the chat view guide: when a view helps, its limits, the plain HTML and components Sumi styles, and the rules every view is checked against. Call it once in a chat before your first view-work_views_show.",
		mcp: {
			kind: "read",
			running: "Reading the view guide",
			done: "Read the view guide",
		},
	})
	.input(ReadGuideAskSchema)
	.output(ViewGuideSchema)
	.handle(async (_asked, { parts }) => viewGuideOf(parts));
