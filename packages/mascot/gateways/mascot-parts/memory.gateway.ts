import { MemoryAgentActivityStore } from "../../shared/lib/agent-activity-store.js";
import type { MascotParts } from "./mascot-parts.gateway.js";

export function memoryMascotParts(): MascotParts {
	return { agentActivityStore: new MemoryAgentActivityStore() };
}
