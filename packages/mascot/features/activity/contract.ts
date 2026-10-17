import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { AgentActivitySchema, AgentEventSchema } from "../../shared/schema/agent-activity.schema.js";

export const AgentActivityQuery = query("mascot/agent-activity").output(AgentActivitySchema).settlesNow();

export const RecordAgentEventsCommand = command("mascot/record-agent-events")
	.input(z.object({ events: z.array(AgentEventSchema).min(1) }))
	.idempotencyKey(Repeatable)
	.invalidates([AgentActivityQuery]);
