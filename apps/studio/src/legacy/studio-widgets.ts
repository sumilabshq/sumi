import type { ImportedWidgets } from "@widgetarium/core/engine/module-registry.js";
import * as band from "./widgets/band/widget.js";
import * as controlMenu from "./widgets/control-menu/widget.js";
import * as safeArea from "./widgets/safe-area/widget.js";
import * as workspaceRail from "./widgets/workspace-rail/widget.js";

export const STUDIO_WIDGETS: ImportedWidgets = {
	"@studio/band": band,
	"@studio/control-menu": controlMenu,
	"@studio/safe-area": safeArea,
	"@studio/workspace-rail": workspaceRail,
};
