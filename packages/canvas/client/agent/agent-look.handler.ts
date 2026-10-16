import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { agentLookNow, agentPageOf, watchAgentLook } from "../../lib/agent/agent-looks.js";
import { AgentLookQuery } from "../../requests/agent-look.query.js";

const LOOKING_AT_PAGE = "Agent is looking at {where}";

const LOOKING_AT_DESIGN = "Agent is looking at the whole design";

export class AgentLookQueryHandler extends handlerOf(AgentLookQuery) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof AgentLookQuery>> {
		const look = agentLookNow();
		const { app } = this.canvasStore.now();
		if (look?.app !== app) return { isShown: false, said: "", canGo: false };
		const page = agentPageOf(look, app);
		if (page === null) return { isShown: true, said: LOOKING_AT_DESIGN, canGo: false };
		const where = look.frame ? `${page} · ${look.frame}` : page;
		return { isShown: true, said: LOOKING_AT_PAGE.replace("{where}", where), canGo: true };
	}

	override watch({ changed }: Watching<typeof AgentLookQuery>): () => void {
		return watchAgentLook(changed);
	}
}
