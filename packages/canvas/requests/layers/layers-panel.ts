import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { StatePictureSchema } from "../../schema/design.js";
import { DesignSource } from "../../ports/design-source.port.js";
import { DesignReads } from "../design/design-reads.js";
import { pagesNow, watchPages } from "../pages/pages-now.js";
import { CanvasStore } from "../view/canvas-store.js";
import { LayerRowSchema, layerRowsOf } from "./layer-rows.js";
import { pickedMarkOf } from "./picked-mark.js";
import { shownScreenOf } from "./shown-screen.js";

export const LayersPanelQuery = query("canvas/layers-panel").output(
	z.object({
		isDrawn: z.boolean(),
		isShown: z.boolean(),
		isLocked: z.boolean(),
		hasPicture: z.boolean(),
		treeKey: z.string(),
		picked: z.string().nullable(),
		liveCopy: StatePictureSchema.nullable(),
		rows: z.array(LayerRowSchema).readonly(),
	}),
);

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
	private readonly designReads = inject(DesignReads);
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);

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

	watch(_input: void, changed: () => void): () => void {
		const fields = ["isLayersOpen", "isLayoutLocked", "mode", "selection", "seenLayers", "closedLayers"] as const;
		return watchPages(this.designReads, this.canvasStore, changed, fields);
	}
}
