import { movedNode } from "@widgetarium/core/engine/node-moves.js";
import { refuse } from "@widgetarium/data-framework";
import type { LayerMove } from "../../../shared/schema/layer-move.schema.js";

const NOT_MOVED = "Nothing was moved: {why}";

export function sourceMoved(source: string, move: LayerMove): string {
	const moved = movedNode(source, move);
	if ("refusal" in moved) return refuse(NOT_MOVED.replace("{why}", moved.refusal));
	return moved.source;
}
