import type { ClockGateway } from "../clock/clock.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";

export type AgentToolsParts = {
	readonly clock: ClockGateway;
};

export function agentToolsPartsOn(): AgentToolsParts {
	return {
		clock: new SystemClockGateway(),
	};
}
