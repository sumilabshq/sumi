import type { McpServer } from "@widgetarium/data-framework";
import type { FoundTool } from "../../../shared/schema/tools.schema.js";

const MOST_TOOLS = 10;
const WORD = /[a-z0-9]+/g;

export function rankedToolsOf(servers: readonly McpServer[], query: string): FoundTool[] {
	const asked = wordsOf(query);
	return servers
		.flatMap((server) => server.tools.map((tool) => foundToolOf(server.name, tool.name, tool.description ?? "")))
		.map((tool) => ({ tool, score: scoreOf(tool, asked) }))
		.filter(({ score }) => score > 0)
		.sort((left, right) => right.score - left.score)
		.slice(0, MOST_TOOLS)
		.map(({ tool }) => tool);
}

function foundToolOf(server: string, tool: string, description: string): FoundTool {
	return { name: `mcp__${server}__${tool}`, description };
}

function scoreOf({ name, description }: FoundTool, asked: readonly string[]): number {
	const named = new Set(wordsOf(name));
	const said = new Set(wordsOf(description));
	return asked.reduce((score, word) => score + (named.has(word) ? 3 : 0) + (said.has(word) ? 1 : 0), 0);
}

function wordsOf(text: string): string[] {
	return text.toLowerCase().match(WORD) ?? [];
}
