import { COMPONENTS_PAGE, DOCS_PAGE, REFERENCES_PAGE } from "../../schema/canvas-page.js";
import type { Drawing } from "../../schema/drawing.js";
import type { Region } from "../../schema/regions.js";
import type { PagesNow } from "../pages/pages-now.js";
import { referencesRegionOf } from "./reference-regions.js";
import { screensRegionOf } from "./screen-regions.js";
import { widgetsRegionOf } from "./widget-regions.js";

export function regionsOf({ pages, design, docs }: PagesNow, drawing: Drawing): Region[] {
	if (pages.shown === DOCS_PAGE)
		return docs.length === 0 ? [] : [{ kind: "docs", title: DOCS_PAGE, count: docs.length, docs: [...docs] }];
	if (pages.shown === REFERENCES_PAGE) return referencesRegionOf(design.references, drawing);
	if (pages.shown === COMPONENTS_PAGE) return widgetsRegionOf(design.widgets, drawing);
	const shown = design.screens.filter((screen) => pages.shownScreens.includes(screen.name));
	return [...referencesRegionOf(pages.shownReferences, drawing), screensRegionOf(shown, pages.shownJob, drawing)];
}
