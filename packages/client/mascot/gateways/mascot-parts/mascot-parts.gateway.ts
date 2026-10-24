import type { AgentActivityStore } from "../../shared/lib/agent-activity-store.js";

export interface MascotParts {
	readonly agentActivityStore: AgentActivityStore;
}
