import { COLOUR_WORDS, LENGTH_WORDS } from "./gpu-tokens.js";
import type { GpuTokens, Rgba } from "./gpu-tokens.js";
import { colourReaderOf } from "./painted-colour.js";
import type { ColourReader } from "./painted-colour.js";
import { isInside, watchCoalesced } from "./watch-coalesced.js";

export const PROBE_SCOPE = "data-gpu-probe";

const TOKEN_MUTATIONS: MutationObserverInit = {
	subtree: true,
	childList: true,
	characterData: true,
	attributeFilter: ["style", "class"],
};

export function tokensOfDocument(from: Element): GpuTokens {
	const probe = from.ownerDocument.createElement("span");
	probe.style.position = "absolute";
	probe.style.visibility = "hidden";
	from.appendChild(probe);
	try {
		return { colours: coloursOf(probe, colourReaderOf(from.ownerDocument)), lengths: lengthsOf(probe) };
	} finally {
		probe.remove();
	}
}

export function watchTokens(from: Element, changed: (tokens: GpuTokens) => void): () => void {
	let seen = JSON.stringify(tokensOfDocument(from));
	const reaches = (record: MutationRecord): boolean =>
		!isInside(record.target, `[${PROBE_SCOPE}]`) && (record.type !== "attributes" || record.target.contains(from));
	return watchCoalesced({ target: from.ownerDocument.documentElement, options: TOKEN_MUTATIONS, reaches }, () => {
		const tokens = tokensOfDocument(from);
		const written = JSON.stringify(tokens);
		if (written === seen) {
			return;
		}

		seen = written;
		changed(tokens);
	});
}

function coloursOf(probe: HTMLElement, readColour: ColourReader): Record<string, Rgba> {
	const colours: Record<string, Rgba> = {};
	for (const [word, expression] of Object.entries(COLOUR_WORDS)) {
		probe.style.color = "";
		probe.style.color = expression;
		const rgba = readColour(getComputedStyle(probe).color);
		if (rgba) {
			colours[word] = rgba;
		}
	}

	return colours;
}

function lengthsOf(probe: HTMLElement): Record<string, number> {
	const lengths: Record<string, number> = {};
	for (const [word, expression] of Object.entries(LENGTH_WORDS)) {
		probe.style.width = "";
		probe.style.width = expression;
		const px = Number.parseFloat(getComputedStyle(probe).width);
		if (Number.isFinite(px)) {
			lengths[word] = px;
		}
	}

	return lengths;
}
