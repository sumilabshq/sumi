export type StateParts = Readonly<Record<string, string>>;

export const BOARD_CARD: StateParts = {
	ink: ".state .wg-mascot",
	title: ".st-t",
	reason: ".st-r",
	primary: ".acts .b52",
	quiet: ".acts .b48:not(.wash)",
	ask: ".b48.wash",
	askInk: ".b48.wash .wg-mascot",
	nearMatch: ".fchip.wash",
	field: ".bigfield",
	fieldIcon: ".bigfield > span:first-child > svg",
	fieldWords: ".bigfield .ph",
	go: ".bigfield .go",
	recentLabel: ".recent .lb",
	chips: ".fchip:not(.wash)",
	favicons: ".fchip:not(.wash) .fav",
	banner: ".banner",
	bannerInk: ".banner .wg-mascot",
	bannerTitle: ".banner .tx b",
	bannerLine: ".banner .tx span",
	bannerButton: ".banner .b40",
};

export const BUILT_CARD: StateParts = {
	ink: "[data-browser-page-state] .wg-mascot",
	title: "[data-browser-page-state] h2",
	reason: "[data-browser-page-state] > p",
	primary: "[data-browser-primary-action]",
	quiet: "[data-browser-quiet-action]",
	ask: "[data-browser-ask-ink]",
	askInk: "[data-browser-ask-ink] .wg-mascot",
	nearMatch: "[data-browser-near-match]",
	field: "[data-browser-new-tab-field]",
	fieldIcon: "[data-browser-new-tab-field] > svg",
	fieldWords: "[data-browser-new-tab-field] input",
	go: "[data-browser-new-tab-field] button",
	recentLabel: "[data-browser-recent-label]",
	chips: "[data-browser-recent-site]",
	favicons: "[data-browser-recent-site] > :first-child",
	banner: "[data-browser-ink-kept-out]",
	bannerInk: "[data-browser-ink-kept-out] .wg-mascot",
	bannerTitle: "[data-browser-ink-kept-out] b",
	bannerLine: "[data-browser-ink-kept-out] b + span",
	bannerButton: "[data-browser-ink-kept-out] button",
};

export const MANY = new Set(["primary", "quiet", "ask", "askInk", "chips", "favicons"]);

export const GEIST_LOADED = `(async (faces) => { if (faces !== "") { const sheet = document.createElement("style"); sheet.textContent = faces; document.head.append(sheet); } await Promise.all(["400 15px Geist", "500 30px Geist", "500 13px Geist", "600 14px Geist", "700 13px Geist"].map((face) => document.fonts.load(face))); await document.fonts.ready; return document.fonts.check("500 13px Geist"); })`;

export const STATES_PROBE = `(async (root, parts, many) => {
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const pen = canvas.getContext("2d", { willReadFrequently: true });
	const bytes = (colour) => { pen.clearRect(0, 0, 1, 1); pen.fillStyle = "#000"; pen.fillStyle = colour; pen.fillRect(0, 0, 1, 1); return [...pen.getImageData(0, 0, 1, 1).data]; };
	const over = (top, under) => { const alpha = top[3] / 255; return under.map((value, at) => Math.round(top[at] * alpha + value * (1 - alpha))); };
	const seenFill = (node) => { const layers = []; for (let at = node; at; at = at.parentElement) { const layer = bytes(getComputedStyle(at).backgroundColor); if (layer[3] > 0) layers.push(layer); if (layer[3] === 255) break; } return layers.reverse().reduce((under, layer) => over(layer, under), [255, 255, 255]); };
	const seenUnder = (node) => seenFill(node.parentElement ?? node);
	const textOn = (node, colour) => over(bytes(colour), seenFill(node));
	const shadowsOf = (node) => { const said = getComputedStyle(node).boxShadow; if (said === "none") return []; return said.split(/,(?![^(]*\\))/).filter((one) => { const colour = one.match(/(rgba?|oklch|color)\\([^)]*\\)/)?.[0] ?? "transparent"; return bytes(colour)[3] > 0; }).map((one) => { const colour = one.match(/(rgba?|oklch|color)\\([^)]*\\)/)?.[0] ?? "transparent"; const lengths = one.replace(colour, "").trim().split(/\\s+/).filter((word) => word.endsWith("px")).map(parseFloat); return { colour: over(bytes(colour), seenUnder(node)), spread: lengths[3] ?? 0, blur: lengths[2] ?? 0, inset: one.includes("inset") }; }); };
	const box = (node, from) => { const rect = node.getBoundingClientRect(); return { x: rect.left - from.left, y: rect.top - from.top, w: rect.width, h: rect.height }; };
	const radiusOf = (node) => { const rect = node.getBoundingClientRect(); const radius = parseFloat(getComputedStyle(node).borderTopLeftRadius); return radius >= rect.height / 2 - 0.5 ? "pill" : radius; };
	const lookOf = (node, from) => {
		const style = getComputedStyle(node);
		return { ...box(node, from), radius: radiusOf(node), fill: seenFill(node), colour: textOn(node, style.color), size: parseFloat(style.fontSize), weight: Number(style.fontWeight), lineHeight: style.lineHeight === "normal" ? "normal" : parseFloat(style.lineHeight), tracking: style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing), padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(parseFloat), gap: style.columnGap === "normal" ? 0 : parseFloat(style.columnGap), shadows: shadowsOf(node) };
	};
	const borderOf = (node) => { const style = getComputedStyle(node); const width = parseFloat(style.borderTopWidth); return { width, colour: width > 0 ? over(bytes(style.borderTopColor), seenFill(node)) : null }; };
	const placeholderOf = (node) => { if (node.tagName !== "INPUT") return { colour: textOn(node, getComputedStyle(node).color), size: parseFloat(getComputedStyle(node).fontSize) }; const style = getComputedStyle(node, "::placeholder"); return { colour: textOn(node, style.color), size: parseFloat(style.fontSize) }; };
	const area = document.querySelectorAll(root.selector)[root.at];
	if (!area) return null;
	const from = area.getBoundingClientRect();
	const out = { area: { w: from.width, h: from.height, fill: seenFill(area) } };
	for (const [name, selector] of Object.entries(parts)) {
		const found = [...area.querySelectorAll(selector)].filter((node) => node.getClientRects().length > 0);
		if (name === "field") { out[name] = found[0] ? { ...lookOf(found[0], from), border: borderOf(found[0]) } : null; continue; }
		if (name === "fieldWords") { out[name] = found[0] ? placeholderOf(found[0]) : null; continue; }
		if (name === "favicons") { out[name] = found.map((node) => ({ ...box(node, from), radius: parseFloat(getComputedStyle(node).borderTopLeftRadius) })); continue; }
		if (name === "ink" || name === "askInk" || name === "bannerInk" || name === "fieldIcon") { const shown = many.includes(name) ? found : found.slice(0, 1); const sized = shown.map((node) => box(node, from)); out[name] = many.includes(name) ? sized : sized[0] ?? null; continue; }
		const looks = found.map((node) => lookOf(node, from));
		out[name] = many.includes(name) ? looks : looks[0] ?? null;
	}
	return out;
})`;

export const FAINT_PERCENT = 67;

export const PALETTE_PROBE = `(() => {
	const scope = document.querySelector(".wg-studio");
	const swatch = (colour) => { const probe = document.createElement("i"); probe.style.color = colour; scope.append(probe); const seen = getComputedStyle(probe).color; probe.remove(); const pen = document.createElement("canvas").getContext("2d", { willReadFrequently: true }); pen.fillStyle = seen; pen.fillRect(0, 0, 1, 1); return [...pen.getImageData(0, 0, 1, 1).data].slice(0, 3); };
	return { raise: swatch("var(--raise)"), wash: swatch("var(--accent-wash)"), edge: swatch("var(--border)"), faint: swatch("color-mix(in srgb, var(--muted-foreground) ${FAINT_PERCENT}%, var(--raise))") };
})()`;
