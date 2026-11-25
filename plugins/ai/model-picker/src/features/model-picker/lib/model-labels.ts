import type { OptionsShown, RunnersShown } from "@widgetarium/assistant/contract";

export type EffortShown = OptionsShown[number];

const NO_MODEL = "Choose a model";
const EFFORT_KEY = "effort";

export function chosenLabelOf({ runners, chosenRunner, chosenModel }: RunnersShown): string {
	const runner = runners.find(({ id }) => id === chosenRunner);

	if (runner === undefined) {
		return NO_MODEL;
	}

	return runner.models.find(({ id }) => id === chosenModel)?.label ?? runner.label;
}

export function effortOf(options: OptionsShown): EffortShown | null {
	return options.find(({ option }) => option.key === EFFORT_KEY) ?? null;
}

export function effortLabelOf(effort: EffortShown | null): string | null {
	if (effort === null) {
		return null;
	}

	return effort.option.choices.find(({ value }) => value === effort.value)?.label ?? effort.value;
}
