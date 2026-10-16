import { readNodeMark } from "@widgetarium/core/engine/node-marks.js";
import type { LayerMove } from "../../schema/layer-move.schema.js";

export function layerMoveTo(dragged: string, parent: string, before: string | null): LayerMove | null {
	const from = readNodeMark(dragged);
	const into = readNodeMark(parent);
	const next = before ? readNodeMark(before) : null;
	if (!from || !into || into.file !== from.file || into.sourceKey !== from.sourceKey) return null;
	if (next && (next.file !== from.file || next.sourceKey !== from.sourceKey)) return null;
	return {
		file: from.file,
		sourceKey: from.sourceKey,
		from: from.start,
		into: into.start,
		before: next?.start ?? null,
	};
}
