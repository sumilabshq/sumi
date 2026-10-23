import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";
import type { CataloguePort } from "@widgetarium/core/engine/catalogue-port.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { StudioCatalogue } from "./catalogue/studio-catalogue.js";

export interface StudioSidebarProps {
	readonly catalogue: CataloguePort;
	readonly host: SurfaceHost;
	readonly catalogueAsk: number | null;
	readonly onClose: () => void;
}

const SIDEBAR_LABEL = "Widget catalogue";
const CLOSE_LABEL = "Close the catalogue";

export function StudioSidebar({ catalogue, host, catalogueAsk, onClose }: StudioSidebarProps): ReactElement {
	return h("aside", { className: "wg-studio-sidebar", "aria-label": SIDEBAR_LABEL, "data-panel": "catalogue" }, [
		h(
			"header",
			{ key: "head", className: "wg-studio-sidebar-head" },
			h(
				Button,
				{
					variant: "ghost",
					size: "icon-sm",
					"aria-label": CLOSE_LABEL,
					...tooltipMarks({ said: CLOSE_LABEL }),
					onClick: onClose,
				},
				h(Icon, { name: "x" }),
			),
		),
		h(StudioCatalogue, { key: "catalogue", port: catalogue, host, openedBy: catalogueAsk }),
	]);
}
