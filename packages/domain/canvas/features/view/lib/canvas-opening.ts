import type { CanvasOpened } from "../../../shared/schema/canvas-view.schema.js";
import { isOpenAsAsked, momentOpened, momentWriteOf } from "../../../shared/lib/view/canvas-moment.js";
import type { CanvasMoment, MomentWrite } from "../../../shared/lib/view/canvas-moment.js";

export type CanvasOpenStep =
	| {
			readonly kind: "skip";
			readonly said: string;
	  }
	| {
			readonly kind: "write";
			readonly write: MomentWrite;
	  };

export function canvasOpenStepOf(was: CanvasMoment, opened: CanvasOpened): CanvasOpenStep {
	if (isOpenAsAsked(was, opened)) {
		return skipOf(`canvas open skipped: ${opened.app} /${opened.page} is open, its camera and picks kept`);
	}

	const write = momentWriteOf(was, momentOpened(opened), `open ${opened.app}`);

	if (write === null) {
		return skipOf(`canvas open skipped: ${opened.app} is open as asked`);
	}

	return {
		kind: "write",
		write,
	};
}

function skipOf(said: string): CanvasOpenStep {
	return {
		kind: "skip",
		said,
	};
}
