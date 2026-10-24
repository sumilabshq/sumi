import type { ClaudeEffort, ClaudeModel, PermissionMode } from "@widgetarium/assistant";

export interface OptionFace {
	readonly label: string;
	readonly small?: string;
}

export const MODE_FACES: Readonly<Record<PermissionMode, OptionFace>> = {
	manual: { label: "Ask first", small: "Asks before every edit and command" },
	acceptEdits: { label: "Accept edits", small: "Edits files, asks before commands" },
	plan: { label: "Plan", small: "Reads and plans, changes nothing" },
	auto: { label: "Auto", small: "Edits and runs, stops on risky steps" },
};

export const MODEL_FACES: Readonly<Record<ClaudeModel, OptionFace>> = {
	opus: { label: "Opus", small: "Most capable" },
	sonnet: { label: "Sonnet", small: "Fast for everyday work" },
	haiku: { label: "Haiku", small: "Quickest, lightest" },
	fable: { label: "Fable" },
};

export const EFFORT_FACES: Readonly<Record<ClaudeEffort, OptionFace>> = {
	low: { label: "Low", small: "Answers fast" },
	medium: { label: "Medium" },
	high: { label: "High" },
	xhigh: { label: "Extra high" },
	max: { label: "Max", small: "Thinks longest, uses the most" },
};
