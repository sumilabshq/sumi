import type { ImportedWidgets } from "@widgetarium/core/engine/module-registry.js";
import * as controlMenu from "./widgets/control-menu/widget.js";

export const STUDIO_WIDGETS: ImportedWidgets = {
	"@studio/control-menu": controlMenu,
};
