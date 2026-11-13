import {
	ClaudeEffortSchema,
	ClaudeModelSchema,
	PermissionModeSchema,
} from "../../../shared/schema/claude-options.schema.js";
import type {
	ClaudeModel,
	ClaudeOptionAsked,
	ClaudeOptions,
	PlanUsage,
} from "../../../shared/schema/claude-options.schema.js";
import type {
	AgentModel,
	MetersShown,
	OptionsShown,
	RunnerCatalog,
	RunnersShown,
} from "../../../shared/schema/runner.schema.js";

export const CLAUDE_CODE_RUNNER_ID = "claude-code";

export interface SetupChosen {
	readonly providers: readonly { readonly id: string }[];
	readonly chosen: string;
}

const NO_RUNNER = "no runner {runner} is added, so its model cannot be chosen";
const NO_MODEL = "runner {runner} has no model {model}";
const NO_OPTION = "the chosen model has no option {key}";
const NO_CHOICE = "option {key} has no choice {value}";
const NOT_STORED = "option {key} of runner {runner} has nowhere to be kept yet";

export function runnersShownOf(
	setup: SetupChosen,
	added: readonly RunnerCatalog[],
	claude: ClaudeOptions | null,
): RunnersShown {
	const found = new Set(setup.providers.map(({ id }) => id));
	const runners = added.filter(({ id }) => found.has(id));
	const chosenRunner = runners.some(({ id }) => id === setup.chosen) ? setup.chosen : null;
	return {
		runners: runners.map(({ id, label, models }) => ({ id, label, models })),
		chosenRunner,
		chosenModel: chosenRunner === CLAUDE_CODE_RUNNER_ID ? (claude?.model ?? null) : null,
	};
}

export function chosenModelOf(
	setup: SetupChosen,
	added: readonly RunnerCatalog[],
	claude: ClaudeOptions | null,
): AgentModel | null {
	if (setup.chosen !== CLAUDE_CODE_RUNNER_ID || claude === null) {
		return null;
	}

	const runner = added.find(({ id }) => id === CLAUDE_CODE_RUNNER_ID);
	return runner?.models.find(({ id }) => id === claude.model) ?? null;
}

export function optionsShownOf(model: AgentModel | null, claude: ClaudeOptions | null): OptionsShown {
	if (model === null || claude === null) {
		return [];
	}

	return model.options.map((option) => ({
		option,
		value: claudeValueOf(claude, option.key) ?? option.default,
	}));
}

export function metersShownOf(
	setup: SetupChosen,
	added: readonly RunnerCatalog[],
	claude: ClaudeOptions | null,
): MetersShown {
	if (setup.chosen !== CLAUDE_CODE_RUNNER_ID || claude === null) {
		return [];
	}

	const runner = added.find(({ id }) => id === CLAUDE_CODE_RUNNER_ID);
	return (runner?.meters ?? []).map((meter) => ({
		key: meter.key,
		label: meter.label,
		isReported: claude.usage !== null,
		windows: meter.windows.flatMap((window) => {
			const reported = usageWindowOf(claude.usage, window.key);
			return reported === null ? [] : [{ ...window, ...reported }];
		}),
	}));
}

export function refuseModel(added: readonly RunnerCatalog[], runner: string, model: string): string | null {
	const found = added.find(({ id }) => id === runner);

	if (found === undefined) {
		return NO_RUNNER.replace("{runner}", runner);
	}

	if (!found.models.some(({ id }) => id === model)) {
		return NO_MODEL.replace("{runner}", runner).replace("{model}", model);
	}

	return null;
}

export function claudeModelOf(model: string): ClaudeModel | null {
	const parsed = ClaudeModelSchema.safeParse(model);
	return parsed.success ? parsed.data : null;
}

export function refuseOption(model: AgentModel | null, key: string, value: string): string | null {
	const option = model?.options.find((each) => each.key === key);

	if (option === undefined) {
		return NO_OPTION.replace("{key}", key);
	}

	if (!option.choices.some((choice) => choice.value === value)) {
		return NO_CHOICE.replace("{key}", key).replace("{value}", value);
	}

	return null;
}

export function claudeAskedOf(key: string, value: string): ClaudeOptionAsked | string {
	if (key === "mode") {
		const mode = PermissionModeSchema.safeParse(value);
		return mode.success ? { mode: mode.data } : NO_CHOICE.replace("{key}", key).replace("{value}", value);
	}

	if (key === "effort") {
		const effort = ClaudeEffortSchema.safeParse(value);
		return effort.success ? { effort: effort.data } : NO_CHOICE.replace("{key}", key).replace("{value}", value);
	}

	return NOT_STORED.replace("{key}", key).replace("{runner}", CLAUDE_CODE_RUNNER_ID);
}

function claudeValueOf(claude: ClaudeOptions, key: string): string | null {
	if (key === "mode") {
		return claude.mode;
	}

	if (key === "effort") {
		return claude.effort;
	}

	return null;
}

function usageWindowOf(
	usage: PlanUsage | null,
	key: string,
): { readonly used: number; readonly resetsAt: number } | null {
	if (key === "five-hour") {
		return usage?.fiveHour ?? null;
	}

	if (key === "week") {
		return usage?.week ?? null;
	}

	return null;
}
