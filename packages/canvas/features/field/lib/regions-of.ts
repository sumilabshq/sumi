import { COMPONENTS_PAGE, DOCS_PAGE, REFERENCES_PAGE } from "../../../shared/schema/canvas-page.schema.js";
import type { Drawing } from "../../../shared/schema/drawing.schema.js";
import type { Region } from "../../../shared/schema/regions.schema.js";
import type { PagesNow } from "../../../shared/lib/pages/pages-now.js";
import { referencesRegionOf } from "../../../shared/lib/field/reference-regions.js";
import { screensRegionOf } from "../../../shared/lib/field/screen-regions.js";
import { widgetsRegionOf } from "../../../shared/lib/field/widget-regions.js";

export function regionsOf({ pages, design, docs }: PagesNow, drawing: Drawing): Region[] {
	if (pages.shown === DOCS_PAGE)
		return docs.length === 0 ? [] : [{ kind: "docs", title: DOCS_PAGE, count: docs.length, docs: [...docs] }];
	if (pages.shown === REFERENCES_PAGE) return referencesRegionOf(design.references, drawing);
	if (pages.shown === COMPONENTS_PAGE) return widgetsRegionOf(design.widgets, drawing);
	const shown = design.screens.filter((screen) => pages.shownScreens.includes(screen.name));
	return [...referencesRegionOf(pages.shownReferences, drawing), screensRegionOf(shown, pages.shownJob, drawing)];
}
