import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasHost } from "../../ports/canvas-host.js";
import { PageRendererSchema } from "../../schema/canvas-view.js";
import { CanvasStore } from "./canvas-store.js";

export const RendererSwitchQuery = query("canvas/renderer-switch").output(
	z.object({ isShown: z.boolean(), renderer: PageRendererSchema }),
);

export class RendererSwitchQueryHandler extends handlerOf(RendererSwitchQuery) {
	private readonly canvasStore = inject(CanvasStore);
	private readonly canvasHost = inject(CanvasHost);

	override async handle(): Promise<ReturnedOf<typeof RendererSwitchQuery>> {
		return { isShown: this.canvasHost.gpu !== null, renderer: this.canvasStore.now().renderer };
	}

	watch(_input: void, changed: () => void): () => void {
		return this.canvasStore.watch(["renderer"], changed);
	}
}
