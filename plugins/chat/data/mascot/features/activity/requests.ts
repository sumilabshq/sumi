import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { agentActivityChanged } from "../../gateways/agent-activity/agent-activity.events.js";
import { AgentActivitySchema, AgentEventsSchema } from "../../shared/schema/agent-activity.schema.js";
import { activityAfter } from "./lib/activity-after.js";

export const agentActivity = query()
	.public()
	.output(AgentActivitySchema)
	.settlesNow()
	.handle((_input, { agentActivity }) => agentActivity.agentActivity());

export const recordAgentEvents = command()
	.public()
	.input(AgentEventsSchema)
	.idempotencyKey(Repeatable)
	.handle(({ events }, { agentActivity: agentActivityGateway, invalidate }) => {
		invalidate(agentActivity);
		const was = agentActivityGateway.agentActivity();
		const now = activityAfter(was, events, Date.now());
		const reason = `agent ${events.join(", ")}: ${JSON.stringify(was)} → ${JSON.stringify(now)}`;
		agentActivityGateway.saveAgentActivity(now, reason);
		console.debug(`[widgetarium] ${reason}`);
	});

export const rereadAgentActivity = subscriber(agentActivityChanged).handle((_input, { invalidate }) => {
	invalidate(agentActivity);
});
