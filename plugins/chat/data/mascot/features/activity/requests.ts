import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { AgentActivityChangedEvent } from "../../gateways/agent-activity/agent-activity.events.js";
import { AgentActivitySchema, AgentEventsSchema } from "../../shared/schema/agent-activity.schema.js";
import { activityAfter } from "./lib/activity-after.js";

export const AgentActivityQuery = query("agent-activity")
	.public()
	.output(AgentActivitySchema)
	.settlesNow()
	.handle((_input, { agentActivity }) => agentActivity.agentActivity());

export const RecordAgentEventsCommand = command("record-agent-events")
	.public()
	.input(AgentEventsSchema)
	.idempotencyKey(Repeatable)
	.handle(({ events }, { agentActivity, invalidate }) => {
		invalidate(AgentActivityQuery);
		const was = agentActivity.agentActivity();
		const now = activityAfter(was, events, Date.now());
		const reason = `agent ${events.join(", ")}: ${JSON.stringify(was)} → ${JSON.stringify(now)}`;
		agentActivity.saveAgentActivity(now, reason);
		console.debug(`[widgetarium] ${reason}`);
	});

export const RereadAgentActivitySubscriber = subscriber(AgentActivityChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AgentActivityQuery);
});
