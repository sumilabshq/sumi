import type { PagePlacement } from "./pages-bridge.js";

const RECHECK_MS = 250;

export function placementOf(container: HTMLElement): PagePlacement {
	const box = container.getBoundingClientRect();

	return {
		x: box.left,
		y: box.top,
		width: box.width,
		height: box.height,
		corner: cornerOf(container),
	};
}

export class PagePlacementWatch {
	private last: PagePlacement | null = null;
	private readonly resized: ResizeObserver;
	private readonly timer: ReturnType<typeof setInterval>;

	constructor(
		private readonly container: HTMLElement,
		private readonly placed: (placement: PagePlacement) => void,
	) {
		this.resized = new ResizeObserver(this.measure);
		this.resized.observe(container);
		window.addEventListener("resize", this.measure);
		// TRADE-OFF: a slow poll catches moves no observer reports (a column dragged beside the card); an observer per ancestor would be exact but fragile
		this.timer = setInterval(this.measure, RECHECK_MS);
		this.measure();
	}

	current(): PagePlacement {
		return this.last ?? placementOf(this.container);
	}

	stop(): void {
		this.resized.disconnect();
		window.removeEventListener("resize", this.measure);
		clearInterval(this.timer);
	}

	private readonly measure = (): void => {
		const placement = placementOf(this.container);

		if (isSamePlacement(this.last, placement)) {
			return;
		}

		this.last = placement;
		this.placed(placement);
	};
}

function cornerOf(container: HTMLElement): number {
	const rounded = container.parentElement ?? container;

	return Number.parseFloat(getComputedStyle(rounded).borderTopLeftRadius) || 0;
}

function isSamePlacement(left: PagePlacement | null, right: PagePlacement): boolean {
	if (left === null) {
		return false;
	}

	return (
		left.x === right.x &&
		left.y === right.y &&
		left.width === right.width &&
		left.height === right.height &&
		left.corner === right.corner
	);
}
