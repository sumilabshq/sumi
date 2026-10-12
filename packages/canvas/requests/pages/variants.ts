import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";
import { pagesNow, watchPages } from "./pages-now.js";

export const VariantsQuery = query("canvas/variants").output(
	z.object({
		isShown: z.boolean(),
		shown: z.string(),
		items: z.array(z.object({ value: z.string(), label: z.string() })),
	}),
);

const PICKED = "Picked";

export class VariantsQueryHandler extends handlerOf(VariantsQuery) {
	private readonly designReads = inject(DesignReads);
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof VariantsQuery>> {
		const { pages } = await pagesNow(this.designReads, this.canvasStore);
		return {
			isShown: pages.variants.length >= 2,
			shown: pages.shownScreen ?? "",
			items: pages.variants.map(({ screen, letter }) => ({ value: screen, label: letter ?? PICKED })),
		};
	}

	watch(_input: void, changed: () => void): () => void {
		return watchPages(this.designReads, this.canvasStore, changed);
	}
}
