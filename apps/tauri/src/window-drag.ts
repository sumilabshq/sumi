import { getCurrentWindow } from "@tauri-apps/api/window";

const TITLE_BAND_PX = 60;
const PRIMARY_BUTTON = 0;
const NO_BUTTONS = 0;
const DOUBLE_PRESS = 2;
const KEYBOARD_CLICK = 0;
const PULL_PX = 4;
const OWN_DRAG_SELECTOR = "input, textarea, select, [contenteditable=true], [draggable=true], [data-own-drag]";
const OWN_DRAG_CURSORS: ReadonlySet<string> = new Set(["text", "grab", "col-resize", "ew-resize"]);
const CONTROL_SELECTOR = "button, a, summary, [role=button], [role=tab], [role=menuitem]";
const CONTROL_CURSOR = "pointer";

export function followWindowDrag(): void {
	document.addEventListener("mousedown", dragWindowOnPress);
}

function dragWindowOnPress(event: MouseEvent): void {
	const { target } = event;

	if (!isTitleBandPress(event) || !(target instanceof Element) || hasOwnDrag(target)) {
		return;
	}

	if (isControl(target)) {
		takeWindowOncePulled(event, () => takeWindowWithoutClick(target));
		return;
	}

	if (event.detail === DOUBLE_PRESS) {
		void getCurrentWindow().toggleMaximize();
		return;
	}

	takeWindow(target);
}

function isTitleBandPress(event: MouseEvent): boolean {
	return event.button === PRIMARY_BUTTON && event.clientY <= TITLE_BAND_PX;
}

function hasOwnDrag(target: Element): boolean {
	return target.closest(OWN_DRAG_SELECTOR) !== null || OWN_DRAG_CURSORS.has(getComputedStyle(target).cursor);
}

function isControl(target: Element): boolean {
	return target.closest(CONTROL_SELECTOR) !== null || getComputedStyle(target).cursor === CONTROL_CURSOR;
}

function takeWindowOncePulled(press: MouseEvent, take: () => void): void {
	const waiting = new AbortController();
	const takeOnPull = (move: MouseEvent): void => {
		const isHeld = move.buttons !== NO_BUTTONS;

		if (isHeld && Math.hypot(move.clientX - press.clientX, move.clientY - press.clientY) < PULL_PX) {
			return;
		}

		waiting.abort();

		if (isHeld) {
			take();
		}
	};
	window.addEventListener("mousemove", takeOnPull, { signal: waiting.signal });
	window.addEventListener("mouseup", () => waiting.abort(), { signal: waiting.signal });
}

function takeWindowWithoutClick(target: Element): void {
	swallowClickOfDrag();
	takeWindow(target);
}

function swallowClickOfDrag(): void {
	const swallowing = new AbortController();
	const swallow = (click: MouseEvent): void => {
		if (click.detail === KEYBOARD_CLICK) {
			return;
		}

		click.stopImmediatePropagation();
		click.preventDefault();
		swallowing.abort();
	};
	window.addEventListener("click", swallow, { capture: true, signal: swallowing.signal });
	window.addEventListener("mousedown", () => swallowing.abort(), { capture: true, signal: swallowing.signal });
}

function takeWindow(target: Element): void {
	target.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
	void getCurrentWindow().startDragging();
}
