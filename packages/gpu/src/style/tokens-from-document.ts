import { COLOUR_WORDS, LENGTH_WORDS } from "./gpu-tokens.js";
import type { GpuTokens, Rgba } from "./gpu-tokens.js";

const CHANNEL = "(-?[\\d.]+(?:e-?\\d+)?)";
const RGB_FUNCTION = new RegExp(`^rgba?\\(${CHANNEL},?\\s*${CHANNEL},?\\s*${CHANNEL}(?:\\s*[,/]\\s*${CHANNEL})?\\)$`);
const SRGB_FUNCTION = new RegExp(`^color\\(srgb\\s+${CHANNEL}\\s+${CHANNEL}\\s+${CHANNEL}(?:\\s*/\\s*${CHANNEL})?\\)$`);

export function tokensOfDocument(from: Element): GpuTokens {
	const probe = from.ownerDocument.createElement("span");
	probe.style.position = "absolute";
	probe.style.visibility = "hidden";
	from.appendChild(probe);
	const painter = from.ownerDocument.createElement("canvas").getContext("2d", { willReadFrequently: true });
	try {
		return { colours: coloursOf(probe, painter), lengths: lengthsOf(probe) };
	} finally {
		probe.remove();
	}
}

export function watchTokens(from: Element, changed: (tokens: GpuTokens) => void): () => void {
	let seen = JSON.stringify(tokensOfDocument(from));
	let pending = 0;
	const reread = (): void => {
		pending = 0;
		const tokens = tokensOfDocument(from);
		observer.takeRecords();
		const written = JSON.stringify(tokens);
		if (written === seen) return;
		seen = written;
		changed(tokens);
	};
	const observer = new MutationObserver((records) => {
		const reachesTokens = records.some((record) => record.type !== "attributes" || record.target.contains(from));
		if (reachesTokens && pending === 0) pending = requestAnimationFrame(reread);
	});
	observer.observe(from.ownerDocument.documentElement, {
		subtree: true,
		childList: true,
		characterData: true,
		attributeFilter: ["style", "class"],
	});
	return () => {
		observer.disconnect();
		cancelAnimationFrame(pending);
	};
}

function rgbaOfCss(css: string): Rgba | null {
	const srgb = SRGB_FUNCTION.exec(css);
	if (srgb) return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3]), srgb[4] === undefined ? 1 : Number(srgb[4])];
	const rgb = RGB_FUNCTION.exec(css);
	if (!rgb) return null;
	return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255, rgb[4] === undefined ? 1 : Number(rgb[4])];
}

function coloursOf(probe: HTMLElement, painter: CanvasRenderingContext2D | null): Record<string, Rgba> {
	const colours: Record<string, Rgba> = {};
	for (const [word, expression] of Object.entries(COLOUR_WORDS)) {
		probe.style.color = "";
		probe.style.color = expression;
		const computed = getComputedStyle(probe).color;
		const rgba = rgbaOfCss(computed) ?? paintedRgbaOf(computed, painter);
		if (rgba) colours[word] = rgba;
	}
	return colours;
}

function lengthsOf(probe: HTMLElement): Record<string, number> {
	const lengths: Record<string, number> = {};
	for (const [word, expression] of Object.entries(LENGTH_WORDS)) {
		probe.style.width = "";
		probe.style.width = expression;
		const px = Number.parseFloat(getComputedStyle(probe).width);
		if (Number.isFinite(px)) lengths[word] = px;
	}
	return lengths;
}

function paintedRgbaOf(css: string, painter: CanvasRenderingContext2D | null): Rgba | null {
	if (!painter) return null;
	painter.clearRect(0, 0, 1, 1);
	painter.fillStyle = css;
	painter.fillRect(0, 0, 1, 1);
	const [red = 0, green = 0, blue = 0, alpha = 0] = painter.getImageData(0, 0, 1, 1).data;
	return [red / 255, green / 255, blue / 255, alpha / 255];
}
