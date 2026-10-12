import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../view/canvas-store.js";
import { agentLookNow, watchAgentLook } from "./agent-looks.js";

export const AgentLookQuery = query("canvas/agent-look").output(
	z.object({ isShown: z.boolean(), said: z.string(), canGo: z.boolean() }),
);

const LOOKING_AT_PAGE = "Agent is looking at {where}";
const LOOKING_AT_DESIGN = "Agent is looking at the whole design";

export class AgentLookQueryHandler extends handlerOf(AgentLookQuery) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof AgentLookQuery>> {
		const look = agentLookNow();
		if (look?.app !== this.canvasStore.now().app) return { isShown: false, said: "", canGo: false };
		if (!look.page) return { isShown: true, said: LOOKING_AT_DESIGN, canGo: false };
		const where = look.frame ? `${look.page} · ${look.frame}` : look.page;
		return { isShown: true, said: LOOKING_AT_PAGE.replace("{where}", where), canGo: true };
	}

	watch(_input: void, changed: () => void): () => void {
		return watchAgentLook(changed);
	}
}
