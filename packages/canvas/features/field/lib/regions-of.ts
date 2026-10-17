import { COMPONENTS_PAGE, DOCS_PAGE, REFERENCES_PAGE } from "../../../shared/schema/canvas-page.schema.js";
import type { Drawing } from "../../../shared/schema/drawing.schema.js";
import type { Region } from "../../../shared/schema/regions.schema.js";
import type { PagesNow } from "../../../shared/lib/pages/pages-now.js";
import { referencesRegionOf } from "../../../shared/lib/field/reference-regions.js";
import { screensRegionOf } from "../../../shared/lib/field/screen-regions.js";
import { widgetsRegionOf } from "../../../shared/lib/field/widget-regions.js";
import { screensShownOf } from "../../../shared/lib/layers/shown-screen.js";

export function regionsOf(now: PagesNow, drawing: Drawing): Region[] {
	const { pages, design, docs } = now;
	if (pages.shown === DOCS_PAGE)
		return docs.length === 0 ? [] : [{ kind: "docs", title: DOCS_PAGE, count: docs.length, docs: [...docs] }];
	if (pages.shown === REFERENCES_PAGE) return referencesRegionOf(design.references, drawing);
	if (pages.shown === COMPONENTS_PAGE) return widgetsRegionOf(design.widgets, drawing);
	return [...referencesRegionOf(pages.shownReferences, drawing), screensRegionOf(screensShownOf(now), pages.shownJob)];
}
