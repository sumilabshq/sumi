import type { RunnersShown } from "@widgetarium/assistant/contract";

const NO_MODEL = "Choose a model";

export function chosenLabelOf({ runners, chosenRunner, chosenModel }: RunnersShown): string {
	const runner = runners.find(({ id }) => id === chosenRunner);

	if (runner === undefined) {
		return NO_MODEL;
	}

	return runner.models.find(({ id }) => id === chosenModel)?.label ?? runner.label;
}
