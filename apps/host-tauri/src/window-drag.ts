import { getCurrentWindow } from "@tauri-apps/api/window";

const TITLE_BAND_PX = 60;
const PRIMARY_BUTTON = 0;
const INTERACTIVE =
	"button, a, input, textarea, select, summary, [role=button], [role=tab], [role=menuitem], [contenteditable=true], [draggable=true]";
const POINTING_CURSORS: ReadonlySet<string> = new Set(["pointer", "text", "grab", "col-resize", "ew-resize"]);

export function followWindowDrag(): void {
	document.addEventListener("mousedown", dragOrZoom);
}

function isInteractive(target: Element): boolean {
	if (target.closest(INTERACTIVE) !== null) {
		return true;
	}

	return POINTING_CURSORS.has(getComputedStyle(target).cursor);
}

function isTitleBandPress(event: MouseEvent): boolean {
	if (event.button !== PRIMARY_BUTTON || event.clientY > TITLE_BAND_PX) {
		return false;
	}

	return event.target instanceof Element && !isInteractive(event.target);
}

function dragOrZoom(event: MouseEvent): void {
	if (!isTitleBandPress(event)) {
		return;
	}

	const window = getCurrentWindow();
	void (event.detail === 2 ? window.toggleMaximize() : window.startDragging());
}
