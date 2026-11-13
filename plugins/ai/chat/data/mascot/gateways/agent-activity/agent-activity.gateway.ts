import type { AgentActivity } from "../../shared/schema/agent-activity.schema.js";

export abstract class AgentActivityGateway {
	abstract agentActivity(): AgentActivity;
	abstract saveAgentActivity(activity: AgentActivity, reason: string): void;
	abstract agentActivityChanged(listener: () => void): () => void;
}
