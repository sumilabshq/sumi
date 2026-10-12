import { command, handlerOf, inject } from "@widgetarium/core/mediator";
import { CanvasHost } from "../../ports/canvas-host.js";
import { DesignSource } from "../../ports/design-source.port.js";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";
import { pagesNow } from "./pages-now.js";

export const ReturnToViewCommand = command("canvas/return-to-view").idempotencyKey("none");

export class ReturnToViewCommandHandler extends handlerOf(ReturnToViewCommand) {
	private readonly designReads = inject(DesignReads);
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);
	private readonly canvasHost = inject(CanvasHost);

	override async handle(): Promise<void> {
		if (this.canvasHost.returnToView) return this.canvasHost.returnToView();
		const { app, pages } = await pagesNow(this.designReads, this.canvasStore);
		await this.designSource.returnToView(app, pages.shown);
	}
}
