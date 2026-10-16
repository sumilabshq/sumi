import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasHost } from "../../adapters/canvas-host/canvas-host.adapter.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { RendererSwitchQuery } from "../../requests/renderer-switch.query.js";

export class RendererSwitchQueryHandler extends handlerOf(RendererSwitchQuery) {
	private readonly canvasStore = this.inject(CanvasStore);
	private readonly canvasHost = this.inject(CanvasHost);

	override async handle(): Promise<ReturnedOf<typeof RendererSwitchQuery>> {
		return { isShown: this.canvasHost.gpu !== null, renderer: this.canvasStore.now().renderer };
	}

	override watch({ changed }: Watching<typeof RendererSwitchQuery>): () => void {
		return this.canvasStore.watch(["renderer"], changed);
	}
}
