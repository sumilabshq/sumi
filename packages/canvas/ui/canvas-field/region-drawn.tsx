import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Region } from "../../schema/regions.schema.js";
import { DocsRegion } from "./regions/docs-region.js";
import { NothingDrawn } from "./regions/nothing-drawn.js";
import { PagesRegion } from "./regions/pages-region.js";
import { PlannedPageRegion } from "./regions/planned-page-region.js";
import { ReferencesRegion } from "./regions/references-region.js";
import { WidgetsRegion } from "./regions/widgets-region.js";

export function RegionDrawn({ region }: { readonly region: Region }): ReactElement {
	switch (region.kind) {
		case "docs":
			return <DocsRegion region={region} />;
		case "references":
			return <ReferencesRegion region={region} />;
		case "pages":
			return <PagesRegion region={region} />;
		case "planned":
			return <PlannedPageRegion region={region} />;
		case "nothing":
			return <NothingDrawn region={region} />;
		case "widgets":
			return <WidgetsRegion region={region} />;
	}
}
