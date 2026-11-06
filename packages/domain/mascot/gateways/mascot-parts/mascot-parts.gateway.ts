import type { ModuleFacts, Platform } from "@widgetarium/framework";
import type { AgentActivityGateway } from "../agent-activity/agent-activity.gateway.js";
import { memoryMascotParts } from "./memory.gateway.js";

export type MascotParts = {
	readonly agentActivity: AgentActivityGateway;
};

const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => MascotParts>> = {
	browser: () => memoryMascotParts(),
	tauri: () => memoryMascotParts(),
	server: () => memoryMascotParts(),
};

export function mascotPartsOn(facts: ModuleFacts): MascotParts {
	return PARTS_ON[facts.platform](facts);
}
