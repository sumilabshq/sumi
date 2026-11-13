import type { AgentToolsConfig } from "../../shared/host/agent-tools.host.js";
import type { ClockGateway } from "../clock/clock.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import { ConfiguredToolListingsGateway } from "../tool-listings/configured.gateway.js";
import type { ToolListingsGateway } from "../tool-listings/tool-listings.gateway.js";

export type AgentToolsParts = {
	readonly clock: ClockGateway;
	readonly toolListings: ToolListingsGateway;
};

export function agentToolsPartsOn({ config }: { readonly config: AgentToolsConfig }): AgentToolsParts {
	return {
		clock: new SystemClockGateway(),
		toolListings: new ConfiguredToolListingsGateway(config),
	};
}
