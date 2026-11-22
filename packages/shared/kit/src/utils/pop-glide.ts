import { POPOVER_ITEM } from "../constants/popover";
import { prefersReducedMotion } from "./reduced-motion";
import { CORNER_TENSION, frameStepOf, isSettled, restingSpring, springToward } from "./spring";
import type { Tension } from "./spring";

const SCROLLER =
	".wg-kit-pop-list, .wg-kit-pop-scroll, .sumi-pane-list, .wg-kit-side-content, .wg-kit-side-panel-rows, [data-glide-scroll]";
const GLIDE_ITEM = `${POPOVER_ITEM}, [role^="menuitem"]:not([disabled]), [role="option"]:not([disabled])`;
const GLIDE_HOST = "data-glide-host";
const LEADING_TENSION: Tension = {
	stiff: 300,
	damp: 24,
};
const REVEAL_RATE = 18;
const SHOWN_PX = 0.5;
const SHOWN_SHARE = 0.01;

interface Span {
	readonly top: number;
	readonly bottom: number;
	readonly left: number;
	readonly width: number;
}

interface Point {
	readonly x: number;
	readonly y: number;
}

export function followHighlight(panel: HTMLElement): () => void {
	const glide = document.createElement("span");
	glide.className = "wg-kit-pop-glide";
	glide.setAttribute("aria-hidden", "true");
	(panel.querySelector(":scope > .wg-kit-pop-inner") ?? panel).append(glide);
	panel.setAttribute(GLIDE_HOST, "");
	const roundPx = Number.parseFloat(getComputedStyle(glide).borderTopLeftRadius) || 0;
	const upper = restingSpring();
	const lower = restingSpring();
	let left = 0;
	let width = 0;
	let target: HTMLElement | null = null;
	let pointer: Point | null = null;
	let centre: Point = {
		x: 0,
		y: 0,
	};
	let shown = 0;
	let frame = 0;
	let last = 0;

	const roomOf = (): DOMRect => (glide.offsetParent ?? panel).getBoundingClientRect();

	const spanOf = (item: HTMLElement): Span => {
		const room = roomOf();
		const box = item.getBoundingClientRect();
		const seen = item.closest(SCROLLER)?.getBoundingClientRect() ?? box;
		const top = Math.max(box.top, seen.top);
		return {
			top: top - room.top,
			bottom: Math.max(top, Math.min(box.bottom, seen.bottom)) - room.top,
			left: box.left - room.left,
			width: box.width,
		};
	};

	const centreAt = (at: Point | null): Point => {
		const room = roomOf();
		const tall = Math.max(0, lower.y - upper.y);
		const x = at === null ? width / 2 : at.x - room.left - left;
		const y = at === null ? tall / 2 : at.y - room.top - upper.y;
		return {
			x: Math.max(0, Math.min(width, x)),
			y: Math.max(0, Math.min(tall, y)),
		};
	};

	const draw = (): void => {
		const tall = Math.max(0, lower.y - upper.y);
		glide.style.left = `${left.toFixed(2)}px`;
		glide.style.width = `${width.toFixed(2)}px`;
		glide.style.transform = `translateY(${upper.y.toFixed(2)}px)`;
		glide.style.height = `${tall.toFixed(2)}px`;
		const hidden = 1 - shown;
		const x = Math.min(width, centre.x);
		const y = Math.min(tall, centre.y);
		const inset = [y * hidden, (width - x) * hidden, (tall - y) * hidden, x * hidden].map(
			(side) => `${side.toFixed(2)}px`,
		);
		glide.style.clipPath = `inset(${inset.join(" ")} round ${roundPx}px)`;
		glide.style.opacity = shown < SHOWN_SHARE || tall < SHOWN_PX ? "0" : "1";
	};

	const place = (span: Span): void => {
		Object.assign(upper, { y: span.top, vy: 0 });
		Object.assign(lower, { y: span.bottom, vy: 0 });
		left = span.left;
		width = span.width;
	};

	const step = (now: number): void => {
		const dt = frameStepOf(now, last);
		last = now;
		let isResting = true;

		if (target !== null) {
			const goal = spanOf(target);
			const goesDown = goal.top > upper.y;
			springToward(upper, { x: 0, y: goal.top }, goesDown ? CORNER_TENSION : LEADING_TENSION, dt);
			springToward(lower, { x: 0, y: goal.bottom }, goesDown ? LEADING_TENSION : CORNER_TENSION, dt);
			left += (goal.left - left) * Math.min(1, dt * REVEAL_RATE);
			width += (goal.width - width) * Math.min(1, dt * REVEAL_RATE);
			isResting = isSettled(upper, { x: 0, y: goal.top }) && isSettled(lower, { x: 0, y: goal.bottom });
		}

		const wanted = target === null ? 0 : 1;
		shown += (wanted - shown) * Math.min(1, dt * REVEAL_RATE);
		const isDone = Math.abs(wanted - shown) < SHOWN_SHARE;

		if (isDone) {
			shown = wanted;
		}

		draw();

		if (isResting && isDone) {
			frame = 0;
			return;
		}

		frame = requestAnimationFrame(step);
	};

	const run = (): void => {
		if (frame !== 0) {
			return;
		}

		last = performance.now();
		frame = requestAnimationFrame(step);
	};

	const aimAt = (item: HTMLElement | null): void => {
		if (item === target) {
			return;
		}

		const isHidden = shown < SHOWN_SHARE;
		target = item;

		if (item !== null && isHidden) {
			place(spanOf(item));
			centre = centreAt(pointer);
		}

		if (item === null && !isHidden) {
			centre = centreAt(pointer);
		}

		if (prefersReducedMotion()) {
			if (item !== null) {
				place(spanOf(item));
			}

			shown = item === null ? 0 : 1;
			draw();
			return;
		}

		run();
	};

	const itemOf = (node: EventTarget | null): HTMLElement | null =>
		node instanceof Element ? node.closest<HTMLElement>(GLIDE_ITEM) : null;

	const onMove = (event: PointerEvent): void => {
		pointer = {
			x: event.clientX,
			y: event.clientY,
		};
		aimAt(itemOf(document.elementFromPoint(event.clientX, event.clientY)) ?? target);
	};

	const onFocus = (event: FocusEvent): void => {
		if (!(event.target instanceof Element) || !event.target.matches(":focus-visible")) {
			return;
		}

		pointer = null;
		aimAt(itemOf(event.target));
	};

	const onLeave = (event: PointerEvent): void => {
		pointer = {
			x: event.clientX,
			y: event.clientY,
		};
		aimAt(null);
	};

	panel.addEventListener("pointermove", onMove);
	panel.addEventListener("pointerdown", onMove);
	panel.addEventListener("focusin", onFocus);
	panel.addEventListener("pointerleave", onLeave);
	return () => {
		cancelAnimationFrame(frame);
		glide.remove();
		panel.removeAttribute(GLIDE_HOST);
		panel.removeEventListener("pointermove", onMove);
		panel.removeEventListener("pointerdown", onMove);
		panel.removeEventListener("focusin", onFocus);
		panel.removeEventListener("pointerleave", onLeave);
	};
}
