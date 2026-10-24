import { AgentActivitySchema } from "../../shared/schema/agent-activity.schema.js";
import type { AgentActivity } from "../../shared/schema/agent-activity.schema.js";
import { AgentActivityGateway } from "./agent-activity.gateway.js";

export class MemoryAgentActivityGateway extends AgentActivityGateway {
	private readonly listeners = new Set<() => void>();
	private held: AgentActivity = AgentActivitySchema.parse({});

	agentActivity(): AgentActivity {
		return this.held;
	}

	saveAgentActivity(activity: AgentActivity): void {
		this.held = activity;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	agentActivityChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
