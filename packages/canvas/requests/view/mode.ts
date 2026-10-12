import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasModeSchema } from "../../schema/canvas-view.js";
import { CanvasStore } from "./canvas-store.js";

export const ModeQuery = query("canvas/mode").output(z.object({ mode: CanvasModeSchema }));

export class ModeQueryHandler extends handlerOf(ModeQuery) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof ModeQuery>> {
		return { mode: this.canvasStore.now().mode };
	}

	watch(_input: void, changed: () => void): () => void {
		return this.canvasStore.watch(["mode"], changed);
	}
}
