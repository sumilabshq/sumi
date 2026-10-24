import type { CanvasDoc } from "../../schema/doc.schema.js";
import type { DrawnDesign } from "../../schema/drawn-design.schema.js";
import type { CanvasField } from "../../schema/canvas-moment.schema.js";
import type { Job } from "../../schema/job.schema.js";
import { NOTHING_DRAWN, refusedDesignOf } from "../design/design-shown.js";
import type { DesignFolderRead } from "../design/design-shown.js";
import type { CanvasMoment } from "../view/canvas-moment.js";
import { canvasPagesOf } from "./canvas-pages.js";
import type { CanvasPages } from "./canvas-pages.js";

export interface PagesNow {
	readonly app: string;
	readonly pages: CanvasPages;
	readonly design: DrawnDesign;
	readonly docs: readonly CanvasDoc[];
}

const NO_DESIGN_YET = "{app} has no design yet, or it was removed.";

export const PAGE_FIELDS: readonly CanvasField[] = ["app", "page", "keptPage", "variants"];

export function pagesNowOf(moment: CanvasMoment, folder: DesignFolderRead, jobs: readonly Job[]): PagesNow {
	const { app, page, keptPage, variants } = moment;
	const design = designShownOf(app, folder, jobs);
	const held = {
		design,
		jobs,
		hasDocs: folder.docs.length > 0,
		keptPage,
		variants,
	};
	return {
		app,
		pages: canvasPagesOf(page, held),
		design,
		docs: folder.docs,
	};
}

function designShownOf(app: string, { design, docs, look }: DesignFolderRead, jobs: readonly Job[]): DrawnDesign {
	if (design !== null) {
		return design;
	}

	const isStarting = jobs.length > 0 || docs.length > 0 || look !== null;
	return isStarting ? NOTHING_DRAWN : refusedDesignOf(app, NO_DESIGN_YET.replace("{app}", app));
}
