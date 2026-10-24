import { isInside, watchCoalesced } from "./watch-coalesced.js";

const STYLE_SHEET = 'style, link[rel="stylesheet"]';
const SHEET_MUTATIONS: MutationObserverInit = { childList: true, subtree: true, characterData: true };

export function watchStyleSheets(head: HTMLElement, changed: () => void): () => void {
	const reaches = (record: MutationRecord): boolean =>
		[record.target, ...record.addedNodes, ...record.removedNodes].some((node) => isInside(node, STYLE_SHEET));
	return watchCoalesced({ target: head, options: SHEET_MUTATIONS, reaches }, changed);
}
