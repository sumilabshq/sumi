import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import { AgentLookSchema } from "../../schemas/agent-look.schema.js";
import type { AgentLook } from "../../schemas/agent-look.schema.js";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";
import { agentLookNow, watchAgentLook } from "./agent-look.js";

export class AgentLookQuery extends IQuery.output(AgentLookSchema.nullable()) {
	readonly settlesNow = true;

	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	get(): AgentLook | null {
		const look = agentLookNow();
		return look?.app === canvasSourceIn(this.ports).app ? look : null;
	}

	override subscribe(changed: () => void): () => void {
		return watchAgentLook(changed);
	}
}
