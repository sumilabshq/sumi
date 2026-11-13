import { MemoryAgentActivityGateway } from "../agent-activity/memory.gateway.js";
import type { MascotParts } from "./mascot-parts.gateway.js";

export function memoryMascotParts(): MascotParts {
	return {
		agentActivity: new MemoryAgentActivityGateway(),
	};
}
