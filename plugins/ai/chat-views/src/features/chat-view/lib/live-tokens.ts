const TOKEN_NAME = /--[a-z][a-z0-9-]*/g;
const DARK_CLASSES = ["dark", "theme-dark"];
const FONT_ADDRESS = /url\((["']?)([^"')]+)\1\)/g;

export function tokenNamesOf(text: string): readonly string[] {
	return [...new Set(text.match(TOKEN_NAME) ?? [])].sort();
}

export function tokenSheetOf(host: Element, names: readonly string[]): string {
	const style = getComputedStyle(host);
	const declared = names
		.map((name) => [name, style.getPropertyValue(name).trim()] as const)
		.filter(([, value]) => value !== "")
		.map(([name, value]) => `${name}: ${value};`);
	return `:root { color-scheme: ${schemeOf(host.ownerDocument)}; ${declared.join(" ")} }`;
}

export function schemeOf(page: Document): "dark" | "light" {
	const root = page.documentElement;
	return DARK_CLASSES.some((name) => root.classList.contains(name)) ? "dark" : "light";
}

export function fontFacesOf(page: Document): string {
	return [...page.styleSheets].flatMap((sheet) => fontFacesIn(sheet, page.baseURI)).join("\n");
}

export function watchesTheme(page: Document, changed: () => void): () => void {
	const watcher = new MutationObserver(changed);
	watcher.observe(page.documentElement, { attributes: true });
	watcher.observe(page.head, {
		childList: true,
		subtree: true,
		characterData: true,
	});
	return () => watcher.disconnect();
}

function fontFacesIn(sheet: CSSStyleSheet, base: string): readonly string[] {
	const rules = rulesOf(sheet);
	const from = sheet.href ?? base;
	return rules
		.filter((rule): rule is CSSFontFaceRule => rule instanceof CSSFontFaceRule)
		.map((rule) =>
			rule.cssText.replace(
				FONT_ADDRESS,
				(_whole, quote: string, address: string) => `url(${quote}${new URL(address, from).href}${quote})`,
			),
		);
}

function rulesOf(sheet: CSSStyleSheet): readonly CSSRule[] {
	try {
		return [...sheet.cssRules];
	} catch {
		return [];
	}
}
