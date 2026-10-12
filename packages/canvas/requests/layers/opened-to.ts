import { ancestorsOf, parentsOf } from "@widgetarium/behaviors";
import type { Selection } from "../../schema/selection.js";
import type { CanvasMoment } from "../view/canvas-moment.js";

export function openedTo(moment: CanvasMoment, selection: Selection | null): readonly string[] {
	if (!selection) return moment.closedLayers;
	const above = ancestorsOf(parentsOf(moment.seenLayers[selection.widget] ?? []), selection.mark);
	const closed = moment.closedLayers.filter((mark) => !above.has(mark));
	return closed.length === moment.closedLayers.length ? moment.closedLayers : closed;
}
