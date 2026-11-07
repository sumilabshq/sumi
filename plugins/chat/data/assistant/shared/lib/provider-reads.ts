import type { AssistantProvider } from "@widgetarium/core/engine/assistant-port.js";
import type { ProviderReads } from "../schema/agent-setup.schema.js";

const READS_NOTHING: ProviderReads = {
	images: false,
	files: "none",
};

export function readsOf(provider: Pick<AssistantProvider, "reads"> | undefined): ProviderReads {
	return provider?.reads ?? READS_NOTHING;
}
