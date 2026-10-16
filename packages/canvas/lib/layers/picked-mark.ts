import type { CanvasMoment } from "../view/canvas-moment.js";

export function pickedMarkOf(
	{ selection }: Pick<CanvasMoment, "selection">,
	widgets: readonly string[],
): string | null {
	return selection !== null && widgets.includes(selection.widget) ? selection.mark : null;
}
