import { Device, module } from "@widgetarium/data-framework";
import { mascotPartsOn } from "./gateways/mascot-parts/mascot-parts.gateway.js";
import {
	RereadAgentActivitySubscriber,
	AgentActivityQuery,
	RecordAgentEventsCommand,
} from "./features/activity/requests.js";

export const MascotModule = module("mascot")
	.on(Device)
	.subscribers(RereadAgentActivitySubscriber)
	.public(AgentActivityQuery, RecordAgentEventsCommand)
	.provide((facts) => mascotPartsOn(facts));
