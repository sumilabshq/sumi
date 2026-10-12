import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import { CanvasStore } from "../view/canvas-store.js";
import { agentLookNow, agentPageOf } from "./agent-looks.js";

export const ShowAgentPageCommand = command("canvas/show-agent-page").idempotencyKey("none");

const LOOKS_NOWHERE = "The agent is not looking at a page of this app.";

export class ShowAgentPageCommandHandler extends handlerOf(ShowAgentPageCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<void> {
		const page = agentPageOf(agentLookNow(), this.canvasStore.now().app);
		if (page === null) throw new Error(LOOKS_NOWHERE);
		this.canvasStore.change({ page }, `show ${page}, where the agent looks`);
	}
}
