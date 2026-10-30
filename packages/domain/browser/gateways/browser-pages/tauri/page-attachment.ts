import { PageCover } from "./page-cover.js";
import { PagePlacementWatch } from "./page-placement.js";
import type { PageFrame, PagePlacement, PagesBridge } from "./pages-bridge.js";

export interface Attached {
	readonly container: HTMLElement;
	readonly placement: PagePlacementWatch;
	readonly cover: PageCover;
	readonly inPageCheck: ReturnType<typeof setInterval> | null;
}

export interface AttachmentPorts {
	readonly container: HTMLElement;
	readonly bridge: PagesBridge;
	readonly placeAt: (placement: PagePlacement) => void;
	readonly sync: () => void;
	readonly drawnPage: () => string | null;
	readonly checkInPageNavigation: (() => void) | null;
}

const IN_PAGE_CHECK_MS = 1000;

export function createAttachment(ports: AttachmentPorts): Attached {
	const { container, checkInPageNavigation } = ports;
	return {
		container,
		placement: new PagePlacementWatch(container, ports.placeAt, ports.sync),
		cover: new PageCover({
			container,
			bridge: ports.bridge,
			drawnPage: ports.drawnPage,
		}),
		inPageCheck: checkInPageNavigation === null ? null : setInterval(checkInPageNavigation, IN_PAGE_CHECK_MS),
	};
}

export function followCover(attached: Attached | null, isDrawn: boolean): void {
	attached?.cover.follow(isDrawn);
	attached?.cover.recheckSoon();
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
