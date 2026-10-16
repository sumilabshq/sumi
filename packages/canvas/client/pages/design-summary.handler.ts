import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignReads } from "../../lib/design/design-reads.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { DesignSummaryQuery } from "../../requests/design-summary.query.js";

const SCREENS_SAID = "{count} screens · {frames} frames · read only";

export class DesignSummaryQueryHandler extends handlerOf(DesignSummaryQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof DesignSummaryQuery>> {
		const { app } = this.canvasStore.now();
		const { screens } = (await this.designReads.read(app)).design.value;
		const frames = screens.reduce((count, screen) => count + screen.states.length, 0);
		const said = SCREENS_SAID.replace("{count}", String(screens.length)).replace("{frames}", String(frames));
		return { app, said };
	}

	override watch({ changed }: Watching<typeof DesignSummaryQuery>): () => void {
		return this.designReads.watch(this.canvasStore.now().app, changed);
	}
}
