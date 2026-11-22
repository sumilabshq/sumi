import type { Runner, RunnerCatalog } from "@sumi/agent-plugin";
import { claudeLaunchOf } from "./claude-command.js";
import { claudeQuickAskOf } from "./claude-quick-ask.js";

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

const SANDBOX: AgentOption = {
	key: "sandbox",
	label: "Sandbox",
	default: "full",
	choices: [
		{ value: "project", label: "Project folder", note: "Writes only in the project folder" },
		{ value: "read-only", label: "Read only", note: "Reads, changes nothing" },
		{ value: "full", label: "Full access", note: "No limits" },
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
	quickAskOf: claudeQuickAskOf,
	quickModel: "haiku",
	id: "claude-code",
	label: "Claude Code",
	models: [
		{ id: "opus", label: "Opus", note: "Most capable", options: [MODE, SANDBOX, EFFORT] },
		{ id: "sonnet", label: "Sonnet", note: "Fast for everyday work", options: [MODE, SANDBOX, EFFORT] },
		{ id: "haiku", label: "Haiku", note: "Quickest, lightest", options: [MODE, SANDBOX, EFFORT] },
		{ id: "fable", label: "Fable", options: [MODE, SANDBOX, EFFORT] },
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
