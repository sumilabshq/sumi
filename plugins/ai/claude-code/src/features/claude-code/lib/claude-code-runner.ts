import type { Runner, RunnerCatalog } from "@sumi/agent-plugin";
import { claudeLaunchOf } from "./claude-command.js";

type AgentOption = RunnerCatalog["models"][number]["options"][number];

const MODE: AgentOption = {
	key: "mode",
	label: "Permission mode",
	default: "manual",
	choices: [
		{ value: "manual", label: "Ask first", note: "Asks before every edit and command" },
		{ value: "acceptEdits", label: "Accept edits", note: "Edits files, asks before commands" },
		{ value: "plan", label: "Plan", note: "Reads and plans, changes nothing" },
		{ value: "auto", label: "Auto", note: "Edits and runs, stops on risky steps" },
	],
};

const EFFORT: AgentOption = {
	key: "effort",
	label: "Effort",
	default: "medium",
	choices: [
		{ value: "low", label: "Low", note: "Answers fast" },
		{ value: "medium", label: "Medium" },
		{ value: "high", label: "High" },
		{ value: "xhigh", label: "Extra high" },
		{ value: "max", label: "Max", note: "Thinks longest, uses the most" },
	],
};

export const CLAUDE_CODE_RUNNER: Runner = {
	launchOf: claudeLaunchOf,
	id: "claude-code",
	label: "Claude Code",
	models: [
		{ id: "opus", label: "Opus", note: "Most capable", options: [MODE, EFFORT] },
		{ id: "sonnet", label: "Sonnet", note: "Fast for everyday work", options: [MODE, EFFORT] },
		{ id: "haiku", label: "Haiku", note: "Quickest, lightest", options: [MODE, EFFORT] },
		{ id: "fable", label: "Fable", options: [MODE, EFFORT] },
	],
	meters: [
		{
			key: "usage",
			label: "Usage",
			windows: [
				{ key: "five-hour", label: "This 5-hour window" },
				{ key: "week", label: "This week" },
			],
		},
	],
};
