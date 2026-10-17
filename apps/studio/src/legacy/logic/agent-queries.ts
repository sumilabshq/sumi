import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { AgentSetupSchema } from "../shared/agent-setup.js";
import type { AgentSetup } from "../shared/agent-setup.js";
import { NothingAskedSchema } from "../shared/studio-app.js";
import type { NoFields } from "./studio-fields.js";

export class AgentSetupQuery extends IQuery.input(NothingAskedSchema).output(AgentSetupSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async query(): Promise<AgentSetup> {
		const { providers, chosen, helperAgents } = await this.ports.assistant.setup();
		return {
			providers: [...providers],
			chosen,
			helperAgents,
		};
	}

	override subscribe(changed: () => void): () => void {
		return this.ports.assistant.onSetup(changed);
	}
}
