import { IQuery } from "@widgetarium/core";
import { AgentLookSchema } from "../../schemas/agent-look.schema.js";
import type { AgentLook } from "../../schemas/agent-look.schema.js";
import type { CanvasState } from "../view/canvas-state.js";
import { agentLookNow, watchAgentLook } from "./agent-look.js";

export class AgentLookQuery extends IQuery.output(AgentLookSchema.nullable()) {
	readonly settlesNow = true;

	constructor(private readonly state: CanvasState) {
		super();
	}

	get(): AgentLook | null {
		const look = agentLookNow();
		return look?.app === this.state.now().app ? look : null;
	}

	override subscribe(changed: () => void): () => void {
		return watchAgentLook(changed);
	}
}
