import type { z } from "zod";
import {
	AgentSetupQuery,
	AgentSetupSchema,
	ChooseProviderCommand,
	ClearChatCommand,
	HelperAgentsAskedSchema,
	OpenProvidersCommand,
	ProviderAskedSchema,
	SetHelperAgentsCommand,
} from "@widgetarium/assistant";
import type { AgentSetup } from "@widgetarium/assistant";
import { ASSISTANT_NOT_AVAILABLE } from "@widgetarium/core/engine/assistant-port.js";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand, IQuery } from "@widgetarium/core/gateway/queries.js";
import type { StartedApp } from "@widgetarium/core/requests";
import { chatAppFor } from "../../assistant/chat-app.js";
import { NothingAskedSchema } from "../shared/studio-app.js";
import type { NoFields } from "./studio-fields.js";

const NO_AGENT: AgentSetup = {
	isReady: false,
	providerLabel: "",
	providers: [],
	chosen: "",
	helperAgents: false,
	renderMarkdown: null,
};

type Answered<Output> =
	{ readonly ok: true; readonly output: Output } | { readonly ok: false; readonly reason: string };

export class MenuAgentSetupQuery extends IQuery.input(NothingAskedSchema).output(AgentSetupSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async query(): Promise<AgentSetup> {
		if (!this.ports.assistant.can) {
			return NO_AGENT;
		}

		return outputOf(await chatAppOf(this.ports).send(AgentSetupQuery));
	}

	override subscribe(changed: () => void): () => void {
		return this.ports.assistant.onSetup(changed);
	}
}

export class MenuChooseProviderCommand extends ICommand.input(ProviderAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ id }: z.output<typeof ProviderAskedSchema>): Promise<void> {
		outputOf(await chatAppOf(this.ports).send(ChooseProviderCommand, { id }));
	}
}

export class MenuSetHelperAgentsCommand extends ICommand.input(HelperAgentsAskedSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run({ on }: z.output<typeof HelperAgentsAskedSchema>): Promise<void> {
		outputOf(await chatAppOf(this.ports).send(SetHelperAgentsCommand, { on }));
	}
}

export class MenuOpenProvidersCommand extends ICommand {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(): Promise<void> {
		outputOf(await chatAppOf(this.ports).send(OpenProvidersCommand));
	}
}

export class MenuClearChatCommand extends ICommand {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(): Promise<void> {
		outputOf(await chatAppOf(this.ports).send(ClearChatCommand));
	}
}

function chatAppOf(ports: ImplementationPorts): StartedApp {
	const chatApp = chatAppFor(ports.studioState);

	if (!chatApp) {
		throw new Error(ASSISTANT_NOT_AVAILABLE);
	}

	return chatApp;
}

function outputOf<Output>(answer: Answered<Output>): Output {
	if (!answer.ok) {
		throw new Error(answer.reason);
	}

	return answer.output;
}
