import { canvasField, canvasTopBar, jobStatus, layersPanel, lookPanel } from "@widgetarium/canvas";
import type { ImportedWidgets } from "@widgetarium/core/engine/module-registry.js";

export const CANVAS_WIDGETS: ImportedWidgets = {
	"@canvas/canvas-field": canvasField,
	"@canvas/canvas-top-bar": canvasTopBar,
	"@canvas/layers-panel": layersPanel,
	"@canvas/look-panel": lookPanel,
	"@canvas/job-status": jobStatus,
};
