import { handler } from "@widgetarium/core/requests";
import { AgentActivityStore } from "../../shared/lib/agent-activity-store.js";
import { AgentActivityQuery, RecordAgentEventsCommand } from "./contract.js";
import { MascotClientModule } from "../../module.js";

export const AgentActivityQueryHandler = handler(AgentActivityQuery, MascotClientModule)
	.inject({ agentActivityStore: AgentActivityStore })
	.watch((_input, { agentActivityStore }, changed) => agentActivityStore.watch(changed))
	.handle((_input, { agentActivityStore }) => agentActivityStore.now());

export const RecordAgentEventsCommandHandler = handler(RecordAgentEventsCommand, MascotClientModule)
	.inject({ agentActivityStore: AgentActivityStore })
	.handle(({ events }, { agentActivityStore }) => {
		agentActivityStore.record(events, Date.now());
	});
