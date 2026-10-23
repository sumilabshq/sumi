import type { PageCover } from "./page-cover.js";
import type { PagePlacementWatch } from "./page-placement.js";
import type { PageFrame } from "./pages-bridge.js";

export interface Attached {
	readonly container: HTMLElement;
	readonly placement: PagePlacementWatch;
	readonly cover: PageCover;
	readonly inPageCheck: ReturnType<typeof setInterval> | null;
}

export function frameIn(attached: Attached | null, page: string): readonly PageFrame[] {
	if (attached === null) {
		return [];
	}

	return [
		{
			page,
			...attached.placement.current(),
		},
	];
}

export function stopAttachment(attached: Attached): void {
	attached.placement.stop();
	attached.cover.stop();

	if (attached.inPageCheck !== null) {
		clearInterval(attached.inPageCheck);
	}
}
