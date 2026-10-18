import type { AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";

export abstract class AssistantSetupGateway {
	abstract setup(): Promise<AssistantSetup>;
	abstract watch(changed: () => void): () => void;
	abstract chooseProvider(id: string): Promise<void>;
	abstract setHelperAgents(on: boolean): Promise<void>;
	abstract openProviders(): void;
}
