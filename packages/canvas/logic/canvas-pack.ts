import { definePack } from "@widgetarium/core/engine/packs.js";
import { CANVAS_COMMANDS } from "./canvas/canvas-commands.js";
import { CANVAS_QUERIES } from "./canvas/canvas-queries.js";

export const canvasPack = definePack({
	id: "@canvas",
	title: "Design canvas",
	queries: CANVAS_QUERIES,
	commands: CANVAS_COMMANDS,
});
