import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasHost } from "../../ports/canvas-host.js";
import { GpuSupplySchema } from "../../schema/drawing.js";
import { SpotSchema } from "../../schema/selection.js";
import { DesignReads } from "../design/design-reads.js";
import { pagesNow, watchPages } from "../pages/pages-now.js";
import { CanvasStore } from "../view/canvas-store.js";

export const FieldStateQuery = query("canvas/field-state").output(
	z.object({
		page: z.string(),
		isPointer: z.boolean(),
		flyTo: z.string().nullable(),
		pickedMark: z.string().nullable(),
		pickedSpot: SpotSchema.nullable(),
		unresolved: z.object({ widget: z.string(), mark: z.string() }).nullable(),
		gpu: GpuSupplySchema.nullable(),
	}),
);

export class FieldStateQueryHandler extends handlerOf(FieldStateQuery) {
	private readonly designReads = inject(DesignReads);
	private readonly canvasStore = inject(CanvasStore);
	private readonly canvasHost = inject(CanvasHost);

	override async handle(): Promise<ReturnedOf<typeof FieldStateQuery>> {
		const { pages } = await pagesNow(this.designReads, this.canvasStore);
		const { mode, renderer, selection, focusedWidget } = this.canvasStore.now();
		return {
			page: pages.shown,
			isPointer: mode === "pointer",
			flyTo: focusedWidget,
			pickedMark: selection?.mark ?? null,
			pickedSpot: selection?.spot ?? null,
			unresolved: selection && selection.spot === null ? { widget: selection.widget, mark: selection.mark } : null,
			gpu: renderer === "gpu" ? this.canvasHost.gpu : null,
		};
	}

	watch(_input: void, changed: () => void): () => void {
		return watchPages(this.designReads, this.canvasStore, changed, ["mode", "renderer", "selection", "focusedWidget"]);
	}
}
