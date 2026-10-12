import type { CanvasPages } from "../../schemas/canvas-page.schema.js";
import { watchSource } from "../design/design-reads.js";
import type { DesignSource } from "../design/design-source.js";
import { readDesign } from "../design/read-design.js";
import type { CanvasState } from "../view/canvas-state.js";
import { canvasPagesOf } from "./canvas-pages.js";

export async function readPages(source: DesignSource, state: CanvasState): Promise<CanvasPages> {
	const { app, page, keptPage, variants } = state.now();
	const { design, docs } = await readDesign(source, app);
	const held = { design: design.value, jobs: source.jobs(app), hasDocs: docs.length > 0, keptPage, variants };
	return canvasPagesOf(page, held);
}

export function watchPages(source: DesignSource, state: CanvasState, changed: () => void): () => void {
	const stopSource = watchSource(source, state.now().app, changed);
	const stopState = state.watch(["page", "keptPage", "variants"], changed);
	return () => {
		stopSource();
		stopState();
	};
}
