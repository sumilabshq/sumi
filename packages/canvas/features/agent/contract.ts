import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { AgentLookSchema } from "../../shared/schema/agent-look.schema.js";

export const AgentLookQuery = query("canvas/agent-look").output(
	z.object({ isShown: z.boolean(), said: z.string(), canGo: z.boolean() }),
);

export const ShowAgentPageCommand = command("canvas/show-agent-page").idempotencyKey(Repeatable);

export const StartAgentLookCommand = command("canvas/start-agent-look")
	.idempotencyKey(Repeatable)
	.input(AgentLookSchema);

export const EndAgentLookCommand = command("canvas/end-agent-look")
	.idempotencyKey(Repeatable)
	.input(z.object({ isFailed: z.boolean() }));
