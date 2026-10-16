import { handler, refuse } from "@widgetarium/core/requests";
import { agentLookNow, agentPageOf, watchAgentLook } from "../../lib/agent/agent-looks.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { AgentLookQuery, ShowAgentPageCommand } from "./contract.js";

const LOOKING_AT_PAGE = "Agent is looking at {where}";
const LOOKING_AT_DESIGN = "Agent is looking at the whole design";
const LOOKS_NOWHERE = "The agent is not looking at a page of this app.";

export const agentLookHandler = handler(AgentLookQuery, {
	inject: { canvasStore: CanvasStore },
	run: (_input, { canvasStore }) => {
		const look = agentLookNow();
		const { app } = canvasStore.now();
		if (look?.app !== app) return { isShown: false, said: "", canGo: false };
		const page = agentPageOf(look, app);
		if (page === null) return { isShown: true, said: LOOKING_AT_DESIGN, canGo: false };
		const where = look.frame ? `${page} · ${look.frame}` : page;
		return { isShown: true, said: LOOKING_AT_PAGE.replace("{where}", where), canGo: true };
	},
	watch: (_input, _injected, changed) => watchAgentLook(changed),
});

export const showAgentPageHandler = handler(ShowAgentPageCommand, {
	inject: { canvasStore: CanvasStore },
	run: (_input, { canvasStore }) => {
		const page = agentPageOf(agentLookNow(), canvasStore.now().app);
		if (page === null) return refuse(LOOKS_NOWHERE);
		canvasStore.change({ page }, `show ${page}, where the agent looks`);
	},
});
