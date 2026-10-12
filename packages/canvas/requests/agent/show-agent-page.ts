import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import { CanvasStore } from "../view/canvas-store.js";
import { agentLookNow } from "./agent-looks.js";

export const ShowAgentPageCommand = command("canvas/show-agent-page").idempotencyKey("none");

const LOOKS_NOWHERE = "The agent is not looking at a page of this app.";

export class ShowAgentPageCommandHandler extends handlerOf(ShowAgentPageCommand) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<void> {
		const look = agentLookNow();
		if (!look?.page || look.app !== this.canvasStore.now().app) throw new Error(LOOKS_NOWHERE);
		this.canvasStore.change({ page: look.page }, `show ${look.page}, where the agent looks`);
	}
}
