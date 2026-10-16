import type { CanvasDoc } from "../../schema/doc.schema.js";
import type { DrawnDesign } from "../../schema/design.schema.js";
import type { DesignReads } from "../design/design-reads.js";
import type { CanvasField } from "../view/canvas-moment.js";
import type { CanvasStore } from "../view/canvas-store.js";
import { canvasPagesOf } from "./canvas-pages.js";
import type { CanvasPages } from "./canvas-pages.js";

export interface PagesNow {
	readonly app: string;
	readonly pages: CanvasPages;
	readonly design: DrawnDesign;
	readonly docs: readonly CanvasDoc[];
}

const PAGE_FIELDS: readonly CanvasField[] = ["page", "keptPage", "variants"];

export async function pagesNow(designReads: DesignReads, canvasStore: CanvasStore): Promise<PagesNow> {
	const { app, page, keptPage, variants } = canvasStore.now();
	const { design, docs, jobs } = await designReads.read(app);
	const held = { design: design.value, jobs, hasDocs: docs.length > 0, keptPage, variants };
	return { app, pages: canvasPagesOf(page, held), design: design.value, docs };
}

export function watchPages(
	designReads: DesignReads,
	canvasStore: CanvasStore,
	changed: () => void,
	fields: readonly CanvasField[] = [],
): () => void {
	const stopSource = designReads.watch(canvasStore.now().app, changed);
	const stopState = canvasStore.watch([...PAGE_FIELDS, ...fields], changed);
	return () => {
		stopSource();
		stopState();
	};
}
