export interface Composer {
	readonly box: HTMLTextAreaElement;
	readonly view: HTMLElement;
}

const FIELD_CHOICE = "data-terminal-cursor";
const INTERACTIVE =
	"button, a[href], input, textarea, select, summary, label, [contenteditable]:not([contenteditable='false']), [draggable='true'], [role='button'], [role='tab'], [role='option'], [role='menuitem'], [role='menu'], [role='dialog'], [role='listbox'], [tabindex]:not([tabindex='-1'], [role='region'])";

const composersByLastFocus: Composer[] = [];

export function isInteractive(target: EventTarget | null): boolean {
	return target instanceof Element && target.closest(INTERACTIVE) !== null;
}

export function typingBox(): HTMLTextAreaElement | null {
	const focused = document.activeElement;

	if (focused === null || focused === document.body) {
		return composersByLastFocus.at(-1)?.box ?? null;
	}

	const around = composersByLastFocus.find(({ view }) => view.contains(focused));

	if (around === undefined) {
		return null;
	}

	return focused === around.box || !isInteractive(focused) ? around.box : null;
}

export function markTypingBox(): void {
	const owner = typingBox();

	for (const { box } of composersByLastFocus) {
		if (box === owner) {
			box.setAttribute(FIELD_CHOICE, "held");
			continue;
		}

		box.removeAttribute(FIELD_CHOICE);
	}
}

export function putLast(composer: Composer): void {
	forget(composer);
	composersByLastFocus.push(composer);
	markTypingBox();
}

export function forget(composer: Composer): void {
	const at = composersByLastFocus.indexOf(composer);

	if (at !== -1) {
		composersByLastFocus.splice(at, 1);
	}

	composer.box.removeAttribute(FIELD_CHOICE);
	markTypingBox();
}
