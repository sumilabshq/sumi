const OWN_DRAG_SELECTOR = "input, textarea, select, [contenteditable=true], [draggable=true], [data-own-drag]";
const OWN_DRAG_CURSORS: ReadonlySet<string> = new Set(["text", "grab", "col-resize", "ew-resize"]);
const CONTROL_SELECTOR = "button, a, summary, [role=button], [role=tab], [role=menuitem]";
const CONTROL_CURSOR = "pointer";

export function hasOwnDrag(target: Element): boolean {
	return target.closest(OWN_DRAG_SELECTOR) !== null || OWN_DRAG_CURSORS.has(getComputedStyle(target).cursor);
}

export function isControl(target: Element): boolean {
	return target.closest(CONTROL_SELECTOR) !== null || getComputedStyle(target).cursor === CONTROL_CURSOR;
}
