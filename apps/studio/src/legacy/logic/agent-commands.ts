import type { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import { HelperAgentsAskedSchema, ProviderAskedSchema } from "../shared/agent-setup.js";
import type { NoFields } from "./studio-fields.js";

export class ChooseProviderCommand extends ICommand.input(ProviderAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	run({ id }: z.output<typeof ProviderAskedSchema>): Promise<void> {
		return this.ports.assistant.chooseProvider(id);
	}
}

export class SetHelperAgentsCommand extends ICommand.input(HelperAgentsAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	run({ on }: z.output<typeof HelperAgentsAskedSchema>): Promise<void> {
		return this.ports.assistant.setHelperAgents(on);
	}
}

export class OpenProvidersCommand extends ICommand {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(): Promise<void> {
		this.ports.assistant.openProviders();
	}
}

export class ClearChatCommand extends ICommand {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	run(): Promise<void> {
		return this.ports.assistant.clear();
	}
}
