const UNITLESS: ReadonlySet<string> = new Set([
	"flex",
	"flexGrow",
	"flexShrink",
	"order",
	"opacity",
	"fontWeight",
	"lineHeight",
	"zIndex",
	"zoom",
	"aspectRatio",
	"columnCount",
	"gridRow",
	"gridColumn",
	"orphans",
	"widows",
	"tabSize",
	"scale",
]);

export type InlineStyle = Readonly<Record<string, string | number>>;

export function inlineStyleOf(held: unknown): InlineStyle | null {
	if (!isRecord(held)) {
		return null;
	}

	const kept = Object.entries(held).filter((entry): entry is [string, string | number] => isStyleValue(entry[1]));
	return kept.length === 0 ? null : Object.fromEntries(kept);
}

export function writeInlineStyle(element: HTMLElement, style: InlineStyle | null): void {
	element.removeAttribute("style");
	for (const [key, value] of Object.entries(style ?? {})) {
		element.style.setProperty(cssPropertyOf(key), cssValueOf(key, value));
	}
}

function cssValueOf(key: string, value: string | number): string {
	if (typeof value === "string") {
		return value.trim();
	}

	return value === 0 || UNITLESS.has(key) ? String(value) : `${value}px`;
}

function cssPropertyOf(key: string): string {
	if (key.startsWith("--")) return key;
	const kebab = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
	return kebab.startsWith("ms-") ? `-${kebab}` : kebab;
}

function isStyleValue(value: unknown): value is string | number {
	return typeof value === "string" || typeof value === "number";
}

function isRecord(held: unknown): held is Readonly<Record<string, unknown>> {
	return typeof held === "object" && held !== null && !Array.isArray(held);
}
