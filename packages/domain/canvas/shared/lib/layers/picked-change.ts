import type { Selection } from "../../schema/selection.schema.js";
import type { CanvasMoment, MomentChange } from "../view/canvas-moment.js";
import { openedTo } from "./opened-to.js";

export interface PickedChange {
	readonly change: MomentChange;
	readonly reason: string;
}

export function pickedChange(moment: CanvasMoment, selection: Selection | null): PickedChange {
	return {
		change: {
			selection,
			closedLayers: openedTo(moment, selection),
		},
		reason: selection ? `pick ${selection.mark}` : "clear the pick",
	};
}
