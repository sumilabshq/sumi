import { isLaidOnScreen } from "../../../shared/lib/is-laid-on-screen.js";
import type { PagePlacement } from "./pages-bridge.js";

const RECHECK_MS = 250;
const EASING_TAIL_MS = 50;

export function placementOf(container: HTMLElement): PagePlacement {
	const box = container.getBoundingClientRect();

	return {
		x: box.left,
		y: box.top,
		width: box.width,
		height: box.height,
		...bottomCornersOf(container),
	};
}

export class PagePlacementWatch {
	private last: PagePlacement | null = null;
	private wasLaidOnScreen = false;
	private easingFrame: number | null = null;
	private easingUntil = 0;
	private readonly resized: ResizeObserver;
	private readonly timer: ReturnType<typeof setInterval>;

	constructor(
		private readonly container: HTMLElement,
		private readonly placed: (placement: PagePlacement) => void,
		private readonly laidOnScreenChanged: () => void,
	) {
		this.resized = new ResizeObserver(this.measure);
		this.resized.observe(container);
		window.addEventListener("resize", this.measure);
		document.addEventListener("transitionrun", this.followEasing, true);
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
		document.removeEventListener("transitionrun", this.followEasing, true);
		clearInterval(this.timer);

		if (this.easingFrame !== null) {
			cancelAnimationFrame(this.easingFrame);
		}
	}

	private readonly followEasing = (event: TransitionEvent): void => {
		if (!(event.target instanceof Element) || !event.target.contains(this.container)) {
			return;
		}

		this.easingUntil = performance.now() + event.elapsedTime * 1000 + EASING_TAIL_MS + durationMsOf(event);

		if (this.easingFrame === null) {
			this.easingFrame = requestAnimationFrame(this.eased);
		}
	};

	private readonly eased = (): void => {
		this.measure();
		this.easingFrame = performance.now() < this.easingUntil ? requestAnimationFrame(this.eased) : null;
	};

	private readonly measure = (): void => {
		const isLaid = isLaidOnScreen(this.container);

		if (isLaid !== this.wasLaidOnScreen) {
			this.wasLaidOnScreen = isLaid;
			this.laidOnScreenChanged();
		}

		const placement = placementOf(this.container);

		if (isSamePlacement(this.last, placement)) {
			return;
		}

		this.last = placement;
		this.placed(placement);
	};
}

const LEFT_SIDE = 1;
const RIGHT_SIDE = 2;

function bottomCornersOf(container: HTMLElement): Pick<PagePlacement, "corner" | "cornerSides"> {
	const rounded = container.closest<HTMLElement>("[data-shell-plate]") ?? container.parentElement ?? container;
	const style = getComputedStyle(rounded);
	const left = Number.parseFloat(style.borderBottomLeftRadius) || 0;
	const right = Number.parseFloat(style.borderBottomRightRadius) || 0;
	return {
		corner: Math.max(left, right),
		cornerSides: (left > 0 ? LEFT_SIDE : 0) | (right > 0 ? RIGHT_SIDE : 0),
	};
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

function durationMsOf(event: TransitionEvent): number {
	if (!(event.target instanceof Element)) {
		return 0;
	}

	const style = getComputedStyle(event.target);
	const names = style.transitionProperty.split(",").map((name) => name.trim());
	const at = Math.max(0, names.indexOf(event.propertyName));
	const durations = style.transitionDuration.split(",");
	const delays = style.transitionDelay.split(",");
	return secondsOf(durations[at] ?? durations[0]) * 1000 + secondsOf(delays[at] ?? delays[0]) * 1000;
}

function secondsOf(value: string | undefined): number {
	const parsed = Number.parseFloat(value ?? "0");
	return value?.trim().endsWith("ms") === true ? parsed / 1000 : parsed;
}
