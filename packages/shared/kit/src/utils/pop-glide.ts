import { POPOVER_ITEM } from "../constants/popover";
import { prefersReducedMotion } from "./reduced-motion";
import { CORNER_TENSION, frameStepOf, isSettled, restingSpring, springToward } from "./spring";
import type { Tension } from "./spring";

const GLIDE_ITEM = `${POPOVER_ITEM}, [role^="menuitem"]:not([disabled]), [role="option"]:not([disabled])`;
const LEADING_TENSION: Tension = {
	stiff: 300,
	damp: 24,
};
const RIM_OVERLAP_PX = 1;
const AT_EDGE_PX = 1;
const CLOSED_PX = 0.5;

interface Span {
	readonly top: number;
	readonly bottom: number;
}

export function followHighlight(panel: HTMLElement): () => void {
	const glide = document.createElement("span");
	glide.className = "wg-kit-pop-glide";
	glide.setAttribute("aria-hidden", "true");
	(panel.querySelector(":scope > .wg-kit-pop-inner") ?? panel).append(glide);
	const upper = restingSpring();
	const lower = restingSpring();
	let target: HTMLElement | null = null;
	let frame = 0;
	let last = 0;

	const spanOf = (item: HTMLElement): Span => {
		const room = (glide.offsetParent ?? panel).getBoundingClientRect();
		const box = item.getBoundingClientRect();
		const top = box.top - room.top;
		const bottom = box.bottom - room.top;
		glide.style.left = `${box.left - room.left - RIM_OVERLAP_PX}px`;
		glide.style.width = `${box.width + 2 * RIM_OVERLAP_PX}px`;
		return {
			top: top < AT_EDGE_PX ? top - RIM_OVERLAP_PX : top,
			bottom: bottom > room.height - AT_EDGE_PX ? bottom + RIM_OVERLAP_PX : bottom,
		};
	};

	const middleOf = ({ top, bottom }: Span): Span => ({ top: (top + bottom) / 2, bottom: (top + bottom) / 2 });
	const drawnMiddle = (): Span => middleOf({ top: upper.y, bottom: lower.y });

	const draw = (): void => {
		const tall = Math.max(0, lower.y - upper.y);
		glide.style.transform = `translateY(${upper.y.toFixed(2)}px)`;
		glide.style.height = `${tall.toFixed(2)}px`;
		glide.style.opacity = tall < CLOSED_PX ? "0" : "1";
	};

	const wear = ({ top, bottom }: Span): void => {
		Object.assign(upper, { y: top, vy: 0 });
		Object.assign(lower, { y: bottom, vy: 0 });
		draw();
	};

	let closesAt = drawnMiddle();

	const step = (now: number): void => {
		const dt = frameStepOf(now, last);
		last = now;
		const goal = target === null ? closesAt : spanOf(target);
		const goesDown = goal.top > upper.y;
		const closes = target === null;
		springToward(upper, { x: 0, y: goal.top }, goesDown && !closes ? CORNER_TENSION : LEADING_TENSION, dt);
		springToward(lower, { x: 0, y: goal.bottom }, goesDown || closes ? LEADING_TENSION : CORNER_TENSION, dt);
		draw();

		if (isSettled(upper, { x: 0, y: goal.top }) && isSettled(lower, { x: 0, y: goal.bottom })) {
			frame = 0;
			wear(goal);
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

		const isClosed = lower.y - upper.y < CLOSED_PX;
		closesAt = drawnMiddle();
		target = item;

		if (prefersReducedMotion()) {
			wear(item === null ? closesAt : spanOf(item));
			return;
		}

		if (item !== null && isClosed) {
			wear(middleOf(spanOf(item)));
		}

		run();
	};

	const itemOf = (node: EventTarget | null): HTMLElement | null =>
		node instanceof Element ? node.closest<HTMLElement>(GLIDE_ITEM) : null;

	const onPoint = (event: Event): void => {
		const item = itemOf(event.target);

		if (item !== null) {
			aimAt(item);
		}
	};

	const onLeave = (): void => aimAt(itemOf(panel.contains(document.activeElement) ? document.activeElement : null));

	panel.addEventListener("pointerover", onPoint);
	panel.addEventListener("focusin", onPoint);
	panel.addEventListener("pointerleave", onLeave);
	return () => {
		cancelAnimationFrame(frame);
		glide.remove();
		panel.removeEventListener("pointerover", onPoint);
		panel.removeEventListener("focusin", onPoint);
		panel.removeEventListener("pointerleave", onLeave);
	};
}
