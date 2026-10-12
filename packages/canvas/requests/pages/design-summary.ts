import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";

export const DesignSummaryQuery = query("canvas/design-summary").output(
	z.object({ app: z.string(), said: z.string() }),
);

const SCREENS_SAID = "{count} screens · {frames} frames · read only";

export class DesignSummaryQueryHandler extends handlerOf(DesignSummaryQuery) {
	private readonly designReads = inject(DesignReads);
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof DesignSummaryQuery>> {
		const { app } = this.canvasStore.now();
		const { screens } = (await this.designReads.read(app)).design.value;
		const frames = screens.reduce((count, screen) => count + screen.states.length, 0);
		const said = SCREENS_SAID.replace("{count}", String(screens.length)).replace("{frames}", String(frames));
		return { app, said };
	}

	watch(_input: void, changed: () => void): () => void {
		return this.designReads.watch(this.canvasStore.now().app, changed);
	}
}
