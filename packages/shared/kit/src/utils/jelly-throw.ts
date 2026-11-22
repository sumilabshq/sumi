import { CORNER_TENSION, frameStepOf, isSettled, restingSpring, springToward } from "./spring";
import type { Point, Spring, Tension } from "./spring";

const LEAN_PX = 6;
const LEAN_REACH_PX = 320;
const BLEED_PX = 24;
const EDGE_INSET_PX = 0.5;
const RIM_INSET_PX = 4.5;
const CLIP_INSET_PX = 4;
const CONTENT_WAITS_MS = 70;
const CONTENT_FADES_MS = 160;
const CONTENT_LEAVES_MS = 90;
const FOLDED_PX = 12;
const FOLD_LASTS_MS = 280;
const FOLD_TENSION: Tension = {
	stiff: 520,
	damp: 46,
};
const BENT = "is-bent";
const GROWING = "is-growing";
const SVG_NS = "http://www.w3.org/2000/svg";
const REST: Point = { x: 0, y: 0 };
const CORNER_UNITS: readonly Point[] = [
	{ x: -1, y: -1 },
	{ x: 1, y: -1 },
	{ x: 1, y: 1 },
	{ x: -1, y: 1 },
];
const ALL_REST: readonly Point[] = CORNER_UNITS.map(() => REST);

interface JellyShape {
	readonly bend: () => void;
	readonly straighten: () => void;
	readonly draw: (corners: readonly Spring[]) => void;
	readonly cutContent: (corners: readonly Spring[], shown: number) => void;
	readonly freeContent: () => void;
}

export function wantsJelly(panel: HTMLElement): boolean {
	return getComputedStyle(panel).getPropertyValue("--pop-motion").trim() === "jelly";
}

export function liveJelly(panel: HTMLElement, from: DOMRect): (() => void) | undefined {
	if (clipsItself(panel)) {
		return undefined;
	}

	const shape = jellyShapeOf(panel);
	const corners = seedsOf(panel.getBoundingClientRect(), from).map((seed) => ({ ...restingSpring(), ...seed }));
	const opened = performance.now();
	let goals = ALL_REST;
	let isOpening = true;
	let isBent = false;
	let frame = 0;
	let last = opened;

	const bend = (): void => {
		isBent = true;
		shape.bend();
	};

	const straighten = (): void => {
		isBent = false;
		isOpening = false;
		shape.freeContent();
		shape.straighten();
	};

	const step = (now: number): void => {
		const dt = frameStepOf(now, last);
		last = now;
		corners.forEach((corner, at) => springToward(corner, goals[at] ?? REST, CORNER_TENSION, dt));
		shape.draw(corners);
		const shown = shownShareOf(now - opened);

		if (isOpening && shown === 1 && corners.every((corner) => farBetween(corner, REST) < FOLDED_PX)) {
			isOpening = false;
			shape.freeContent();
		}

		if (isOpening) {
			shape.cutContent(corners, shown);
		}

		if (isOpening || !corners.every((corner, at) => isSettled(corner, goals[at] ?? REST))) {
			frame = requestAnimationFrame(step);
			return;
		}

		frame = 0;

		if (goals === ALL_REST) {
			straighten();
		}
	};

	const run = (): void => {
		if (frame !== 0) {
			return;
		}

		bend();
		last = performance.now();
		frame = requestAnimationFrame(step);
	};

	const leanToPointer = (event: PointerEvent): void => {
		goals = leanGoalsOf(panel.getBoundingClientRect(), { x: event.clientX, y: event.clientY });

		if (goals !== ALL_REST || isBent) {
			run();
		}
	};

	shape.draw(corners);
	shape.cutContent(corners, 0);
	run();
	document.addEventListener("pointermove", leanToPointer, { passive: true });
	return () => {
		cancelAnimationFrame(frame);
		document.removeEventListener("pointermove", leanToPointer);
		straighten();
	};
}

export function foldJelly(panel: HTMLElement, into: DOMRect, done: () => void): (() => void) | undefined {
	if (clipsItself(panel)) {
		return undefined;
	}

	const shape = jellyShapeOf(panel);
	const corners = CORNER_UNITS.map(() => restingSpring());
	const goals = seedsOf(panel.getBoundingClientRect(), into);
	const started = performance.now();
	let last = started;

	const finish = (): void => {
		shape.freeContent();
		shape.straighten();
		done();
	};

	let frame = requestAnimationFrame(function step(now) {
		const dt = frameStepOf(now, last);
		last = now;
		corners.forEach((corner, at) => springToward(corner, goals[at] ?? REST, FOLD_TENSION, dt));
		shape.draw(corners);
		shape.cutContent(corners, 1 - (now - started) / CONTENT_LEAVES_MS);
		const isFolded = corners.every((corner, at) => farBetween(corner, goals[at] ?? REST) < FOLDED_PX);

		if (isFolded || now - started > FOLD_LASTS_MS) {
			finish();
			return;
		}

		frame = requestAnimationFrame(step);
	});

	shape.draw(corners);
	shape.bend();
	return () => {
		cancelAnimationFrame(frame);
		shape.freeContent();
		shape.straighten();
	};
}

// TRADE-OFF: a panel that scrolls keeps its clip, so its corners would be cut; it opens unbent
function clipsItself(panel: HTMLElement): boolean {
	return panel.scrollHeight > panel.clientHeight + 1;
}

function jellyShapeOf(panel: HTMLElement): JellyShape {
	const content = panel.firstElementChild instanceof HTMLElement ? panel.firstElementChild : null;
	const edge = shapeLine("wg-kit-jelly-edge");
	const rim = shapeLine("wg-kit-jelly-rim");
	const art = document.createElementNS(SVG_NS, "svg");
	art.setAttribute("class", "wg-kit-jelly");
	art.setAttribute("aria-hidden", "true");
	art.append(edge, rim);

	return {
		bend: () => {
			panel.append(art);
			panel.classList.add(BENT);
		},
		straighten: () => {
			art.remove();
			panel.classList.remove(BENT);
		},
		draw: (corners) => {
			const width = panel.offsetWidth;
			const height = panel.offsetHeight;
			art.setAttribute("width", `${width + 2 * BLEED_PX}`);
			art.setAttribute("height", `${height + 2 * BLEED_PX}`);
			edge.setAttribute("points", shapePointsOf(cornerPointsOf(corners, width, height, EDGE_INSET_PX)));
			rim.setAttribute("points", shapePointsOf(cornerPointsOf(corners, width, height, RIM_INSET_PX)));
		},
		cutContent: (corners, shown) => {
			if (content === null) {
				return;
			}

			panel.classList.add(GROWING);
			content.style.opacity = clamped(shown, 0, 1).toFixed(2);
			content.style.clipPath = clipOf(cornerPointsOf(corners, panel.offsetWidth, panel.offsetHeight, CLIP_INSET_PX), {
				x: content.offsetLeft + panel.clientLeft,
				y: content.offsetTop + panel.clientTop,
			});
		},
		freeContent: () => {
			panel.classList.remove(GROWING);

			if (content !== null) {
				content.style.opacity = "";
				content.style.clipPath = "";
			}
		},
	};
}

function shapeLine(className: string): SVGPolygonElement {
	const line = document.createElementNS(SVG_NS, "polygon");
	line.setAttribute("class", className);
	return line;
}

function seedsOf(box: DOMRect, from: DOMRect): Point[] {
	const seed = {
		x: clamped(from.left + from.width / 2, box.left, box.right),
		y: clamped(from.top + from.height / 2, box.top, box.bottom),
	};
	return CORNER_UNITS.map((unit) => ({
		x: seed.x - (unit.x > 0 ? box.right : box.left),
		y: seed.y - (unit.y > 0 ? box.bottom : box.top),
	}));
}

function leanGoalsOf(box: DOMRect, pointer: Point): readonly Point[] {
	const x = pointer.x - (box.left + box.width / 2);
	const y = pointer.y - (box.top + box.height / 2);
	const far = Math.hypot(x, y);
	const reach = Math.hypot(box.width, box.height) / 2;
	const pull = Math.min(1, far / reach) * Math.max(0, 1 - Math.max(0, far - reach) / LEAN_REACH_PX);

	if (far === 0 || pull <= 0) {
		return ALL_REST;
	}

	const toward = { x: x / far, y: y / far };
	return CORNER_UNITS.map((unit) => {
		const lean = Math.max(0, (unit.x * toward.x + unit.y * toward.y) / Math.SQRT2) * pull * LEAN_PX;
		return lean === 0 ? REST : { x: toward.x * lean, y: toward.y * lean };
	});
}

function shownShareOf(elapsedMs: number): number {
	return clamped((elapsedMs - CONTENT_WAITS_MS) / CONTENT_FADES_MS, 0, 1);
}

function farBetween(one: Point, other: Point): number {
	return Math.hypot(one.x - other.x, one.y - other.y);
}

function clamped(value: number, least: number, most: number): number {
	return Math.min(most, Math.max(least, value));
}

function cornerPointsOf(corners: readonly Spring[], width: number, height: number, inset: number): Point[] {
	return CORNER_UNITS.map((unit, at) => {
		const corner = corners[at] ?? restingSpring();
		return {
			x: ((unit.x + 1) / 2) * width - unit.x * inset + corner.x,
			y: ((unit.y + 1) / 2) * height - unit.y * inset + corner.y,
		};
	});
}

function shapePointsOf(points: readonly Point[]): string {
	return points.map(({ x, y }) => `${(x + BLEED_PX).toFixed(1)},${(y + BLEED_PX).toFixed(1)}`).join(" ");
}

function clipOf(points: readonly Point[], origin: Point): string {
	return `polygon(${points.map(({ x, y }) => `${(x - origin.x).toFixed(1)}px ${(y - origin.y).toFixed(1)}px`).join(", ")})`;
}
