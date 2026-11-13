import { query } from "#module";
import { FoundToolsSchema, ToolsAskedSchema } from "../../shared/schema/tools.schema.js";
import { rankedToolsOf } from "./lib/tool-ranks.js";

export const getTools = query()
	.public()
	.metadata({
		description:
			"Find Sumi's tools for a task by words: answers up to ten tools, best first, with the full name to call and what each does. Use it before saying a tool does not exist.",
		mcp: { kind: "other", running: "Looking up tools for", done: "Looked up tools for", shows: "query" },
	})
	.input(ToolsAskedSchema)
	.output(FoundToolsSchema)
	.handle(({ query: words }, { toolListings }) => ({ tools: rankedToolsOf(toolListings.servers(), words) }));
