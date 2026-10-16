import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasHost } from "../../adapters/canvas-host/canvas-host.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { pickedMarkOf } from "../../lib/layers/picked-mark.js";
import { pictureWidgetsShownOf } from "../../lib/layers/shown-screen.js";
import { pagesNow, watchPages } from "../../lib/pages/pages-now.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { FieldStateQuery } from "../../requests/field-state.query.js";

export class FieldStateQueryHandler extends handlerOf(FieldStateQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly canvasStore = this.inject(CanvasStore);
	private readonly canvasHost = this.inject(CanvasHost);

	override async handle(): Promise<ReturnedOf<typeof FieldStateQuery>> {
		const read = await pagesNow(this.designReads, this.canvasStore);
		const moment = this.canvasStore.now();
		const { mode, renderer, selection, focusedWidget } = moment;
		return {
			page: read.pages.shown,
			isPointer: mode === "pointer",
			flyTo: focusedWidget,
			pickedMark: pickedMarkOf(moment, pictureWidgetsShownOf(read)),
			pickedSpot: selection?.spot ?? null,
			unresolved: selection && selection.spot === null ? { widget: selection.widget, mark: selection.mark } : null,
			gpu: renderer === "gpu" ? this.canvasHost.gpu : null,
		};
	}

	override watch({ changed }: Watching<typeof FieldStateQuery>): () => void {
		return watchPages(this.designReads, this.canvasStore, changed, ["mode", "renderer", "selection", "focusedWidget"]);
	}
}
