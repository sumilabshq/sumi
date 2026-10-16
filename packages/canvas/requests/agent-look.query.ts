import { z } from "zod";
import { query } from "@widgetarium/core/mediator";

export const AgentLookQuery = query("canvas/agent-look").output(
	z.object({ isShown: z.boolean(), said: z.string(), canGo: z.boolean() }),
);
