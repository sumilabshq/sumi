import type { CanvasMoment } from "../view/canvas-moment.js";

export function pageTurnWhileRead(asked: CanvasMoment, now: CanvasMoment, what: string): string | null {
	if (now.page === asked.page) {
		return null;
	}

	return `canvas unchanged (${what}: the page turned ${asked.page} → ${now.page} while it was read)`;
}
