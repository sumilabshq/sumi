export function forceStyle(element: HTMLElement, property: string, value: string): void {
	if (value === "") {
		element.style.removeProperty(property);
		return;
	}

	element.style.setProperty(property, value, "important");
}
