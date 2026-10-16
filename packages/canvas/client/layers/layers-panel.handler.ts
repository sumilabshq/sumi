import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { pagesNow, watchPages } from "../../lib/pages/pages-now.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { layerRowsOf } from "../../lib/layers/layer-rows.js";
import { pickedMarkOf } from "../../lib/layers/picked-mark.js";
import { shownScreenOf } from "../../lib/layers/shown-screen.js";
import { LayersPanelQuery } from "../../requests/layers-panel.query.js";

const NOT_DRAWN: ReturnedOf<typeof LayersPanelQuery> = {
	isDrawn: false,
	isShown: false,
	isLocked: true,
	hasPicture: false,
	treeKey: "",
	picked: null,
	liveCopy: null,
	rows: [],
};

export class LayersPanelQueryHandler extends handlerOf(LayersPanelQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly designSource = this.inject(DesignSource);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof LayersPanelQuery>> {
		const shown = shownScreenOf(await pagesNow(this.designReads, this.canvasStore));
		if (!shown) return NOT_DRAWN;
		const moment = this.canvasStore.now();
		const { isLayersOpen, isLayoutLocked, mode, seenLayers, closedLayers } = moment;
		const seen = seenLayers[shown.key] ?? null;
		const picked = pickedMarkOf(moment, shown.picture ? [shown.picture.widget] : []);
		const ask = {
			registry: this.designSource.drawing().registry,
			picked,
			closed: new Set(closedLayers),
			isLocked: isLayoutLocked,
		};
		const isLiveCopied = isLayersOpen || mode === "pointer" || seen === null;
		return {
			isDrawn: true,
			isShown: isLayersOpen && (seen !== null || shown.picture === null),
			isLocked: isLayoutLocked,
			hasPicture: shown.picture !== null,
			treeKey: `tree:${shown.screen.name}:${seen !== null}`,
			picked,
			liveCopy: isLiveCopied ? shown.picture : null,
			rows: layerRowsOf(seen ?? [], ask),
		};
	}

	override watch({ changed }: Watching<typeof LayersPanelQuery>): () => void {
		const fields = ["isLayersOpen", "isLayoutLocked", "mode", "selection", "seenLayers", "closedLayers"] as const;
		return watchPages(this.designReads, this.canvasStore, changed, fields);
	}
}
