import { createElement as h } from "react";
import type { ReactElement } from "react";
import { COMPONENTS_PAGE, DOCS_PAGE, REFERENCES_PAGE } from "../../../schemas/canvas-page.schema.js";
import type { CanvasPages } from "../../../schemas/canvas-page.schema.js";
import type { DrawnDesign } from "../../../schemas/design.schema.js";
import type { CanvasDoc } from "../../../schemas/doc.schema.js";
import type { Drawing } from "../../../schemas/drawing.schema.js";
import { DESKTOP_FRAME } from "../../../schemas/frame-size.schema.js";
import type { WidgetOpener } from "./frames/noted-picture.js";
import { DocsRegion } from "./regions/docs-region.js";
import { PagesRegion } from "./regions/pages-region.js";
import { PlannedPageRegion } from "./regions/planned-page-region.js";
import { ReferencesRegion } from "./regions/references-region.js";
import { VariantSwitch } from "./regions/variant-switch.js";
import { WidgetsRegion } from "./regions/widgets-region.js";

export interface PageRegionsAsk extends Drawing {
	readonly design: DrawnDesign;
	readonly pages: CanvasPages;
	readonly docs: readonly CanvasDoc[];
	readonly opener: WidgetOpener;
	readonly onVariant: (page: string, screen: string) => void;
}

export function regionsOfPage(ask: PageRegionsAsk): ReactElement[] {
	const { design, pages, docs, opener, registry, host } = ask;
	if (pages.shown === DOCS_PAGE) return [<DocsRegion key="docs" title={DOCS_PAGE} docs={docs} host={host} />];
	if (pages.shown === REFERENCES_PAGE)
		return [<ReferencesRegion key="references" references={design.references} opener={opener} />];
	if (pages.shown === COMPONENTS_PAGE)
		return [<WidgetsRegion key="widgets" widgets={design.widgets} registry={registry} host={host} />];
	return screenRegionsOf(ask);
}

function screenRegionsOf({ design, pages, opener, onVariant, registry, host }: PageRegionsAsk): ReactElement[] {
	const page = pages.shown;
	const shown = design.screens.filter((screen) => pages.shownScreens.includes(screen.name));
	const job = pages.shownJob;
	const aside = (
		<VariantSwitch
			variants={pages.variants}
			shown={pages.shownScreen ?? ""}
			onVariant={(screen) => onVariant(page, screen)}
		/>
	);
	const drawn =
		shown.length === 0 && job ? (
			<PlannedPageRegion key="pages" job={job} size={DESKTOP_FRAME} />
		) : (
			<PagesRegion key="pages" screens={shown} size={DESKTOP_FRAME} aside={aside} registry={registry} host={host} />
		);
	return [<ReferencesRegion key="references" references={pages.shownReferences} opener={opener} />, drawn];
}
