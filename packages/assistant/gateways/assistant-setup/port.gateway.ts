import type { AssistantPort, AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import { AssistantSetupGateway } from "./assistant-setup.gateway.js";

export class PortAssistantSetupGateway extends AssistantSetupGateway {
	constructor(private readonly port: AssistantPort) {
		super();
	}

	setup(): Promise<AssistantSetup> {
		return this.port.setup();
	}

	watch(changed: () => void): () => void {
		return this.port.onSetup(changed);
	}

	chooseProvider(id: string): Promise<void> {
		return this.port.chooseProvider(id);
	}

	setHelperAgents(on: boolean): Promise<void> {
		return this.port.setHelperAgents(on);
	}

	openProviders(): void {
		this.port.openProviders();
	}
}
