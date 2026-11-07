import type { AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import type { ProviderReads } from "../schema/agent-setup.schema.js";
import { readsOf } from "./provider-reads.js";

export interface ChosenProvider {
	readonly label: string;
	readonly reads: ProviderReads;
	readonly compacts: boolean;
}

export function chosenOf(setup: Pick<AssistantSetup, "providers" | "chosen" | "providerLabel">): ChosenProvider {
	const chosen = setup.providers.find(({ id }) => id === setup.chosen);
	return {
		label: chosen?.label ?? setup.providerLabel,
		reads: readsOf(chosen),
		compacts: chosen?.compacts === true,
	};
}
