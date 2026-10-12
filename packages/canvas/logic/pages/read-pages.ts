import type { CanvasPages } from "../../schemas/canvas-page.schema.js";
import type { CanvasSource } from "../canvas/canvas-source.js";
import { readDesign } from "../design/read-design.js";
import { canvasPagesOf } from "./canvas-pages.js";

export async function readPages({ design: source, app, state }: CanvasSource): Promise<CanvasPages> {
	const { design, docs } = await readDesign(source, app);
	const { page, keptPage, variants } = state.now();
	const held = { design: design.value, jobs: source.jobs(app), hasDocs: docs.length > 0, keptPage, variants };
	return canvasPagesOf(page, held);
}
