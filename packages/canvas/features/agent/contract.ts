import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";

export const AgentLookQuery = query("canvas/agent-look").output(
	z.object({ isShown: z.boolean(), said: z.string(), canGo: z.boolean() }),
);

export const ShowAgentPageCommand = command("canvas/show-agent-page").idempotencyKey(Repeatable);
