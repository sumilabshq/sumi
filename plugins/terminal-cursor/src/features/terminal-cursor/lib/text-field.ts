export type TextField = HTMLInputElement | HTMLTextAreaElement;

const FIELD_CHOICE = "data-terminal-cursor";
const HELD_FIELD = `[${FIELD_CHOICE}="held"]`;
const TEXT_INPUT_TYPES = new Set(["text", "search", "url", "tel", "password"]);

export function textFieldOf(element: Element | null): TextField | null {
	const isTextField =
		element instanceof HTMLTextAreaElement ||
		(element instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(element.type));

	if (!isTextField || element.getAttribute(FIELD_CHOICE) === "off") {
		return null;
	}

	return element;
}

export function wantedField(): TextField | null {
	return textFieldOf(document.activeElement) ?? textFieldOf(document.querySelector(HELD_FIELD));
}

export function isDrawingOwnText(field: TextField): boolean {
	const hasArea = field.clientWidth > 0 && field.clientHeight > 0;
	return (
		hasArea &&
		field.checkVisibility({
			opacityProperty: true,
			visibilityProperty: true,
		})
	);
}
