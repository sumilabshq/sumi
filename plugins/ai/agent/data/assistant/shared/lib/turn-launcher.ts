import type { TurnFacts, TurnLauncher } from "@widgetarium/core/engine/assistant-port.js";
import type { PromptPart } from "../host/prompt-part.host.js";
import type { Runner } from "../host/runner.host.js";

const NO_RUNNER = "No runner is added for {runner}, so its turn cannot start.";
const PART_GAP = "\n\n";

export function launcherFrom(runners: readonly Runner[], promptParts: readonly PromptPart[]): TurnLauncher {
	return (facts) => {
		const runner = runners.find(({ id }) => id === facts.runner);

		if (runner === undefined) {
			throw new Error(NO_RUNNER.replace("{runner}", facts.runner));
		}

		return runner.launchOf(withPromptParts(facts, promptParts));
	};
}

export function withPromptParts(facts: TurnFacts, promptParts: readonly PromptPart[]): TurnFacts {
	if (facts.link === null) {
		return facts;
	}

	const added = promptParts.map((part) => part()).filter((said) => said !== "");
	return {
		...facts,
		link: {
			...facts.link,
			systemPrompt: [facts.link.systemPrompt, ...added].join(PART_GAP),
		},
	};
}
