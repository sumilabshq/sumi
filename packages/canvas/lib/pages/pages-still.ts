import type { DesignReads } from "../design/design-reads.js";
import type { CanvasStore } from "../view/canvas-store.js";
import { pagesNow } from "./pages-now.js";
import type { PagesNow } from "./pages-now.js";

export async function pagesStill(
	designReads: DesignReads,
	canvasStore: CanvasStore,
	what: string,
): Promise<PagesNow | null> {
	const asked = canvasStore.now().page;
	const now = await pagesNow(designReads, canvasStore);
	const { page } = canvasStore.now();
	if (page === asked) return now;
	console.info(`[widgetarium] ${what} dropped: the page turned ${asked} → ${page} while it was read`);
	return null;
}
