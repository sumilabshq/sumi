import type { QuickAskFacts, TurnLaunch } from "@sumi/agent-plugin";

const PROGRAM = "claude";
const NOTHING_TO_ASK = "There is nothing to ask.";
const ANSWER_ONLY = "Answer with the asked text only: no preamble, no quotes, no markdown.";
const LOWEST_EFFORT = "low";
const NO_TOOLS = "";
const NO_SETTINGS = "";
const END_OF_OPTIONS = "--";

export function claudeQuickAskOf({ model, prompt }: QuickAskFacts): TurnLaunch {
	if (prompt.trim() === "") {
		throw new Error(NOTHING_TO_ASK);
	}

	return {
		program: PROGRAM,
		args: [
			"-p",
			"--output-format",
			"text",
			"--tools",
			NO_TOOLS,
			"--strict-mcp-config",
			"--setting-sources",
			NO_SETTINGS,
			"--no-session-persistence",
			"--effort",
			LOWEST_EFFORT,
			"--system-prompt",
			ANSWER_ONLY,
			...(model === null ? [] : ["--model", model]),
			END_OF_OPTIONS,
			prompt,
		],
		env: {},
	};
}
