import { handlerOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { agentLookNow, agentPageOf } from "../../lib/agent/agent-looks.js";
import { ShowAgentPageCommand } from "../../requests/show-agent-page.command.js";

const LOOKS_NOWHERE = "The agent is not looking at a page of this app.";

export class ShowAgentPageCommandHandler extends handlerOf(ShowAgentPageCommand) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<void> {
		const page = agentPageOf(agentLookNow(), this.canvasStore.now().app);
		if (page === null) throw new Error(LOOKS_NOWHERE);
		this.canvasStore.change({ page }, `show ${page}, where the agent looks`);
	}
}
