import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";

const TAB_LINK = /\[([^\]\n]+)\]\(tab:([\w-]+)\)/g;
const PARAGRAPH_BREAK = /\n{2,}/;
const TAB_ATTRIBUTE = "data-tab";

export function tabLinksRenderer(showTab: (tabId: string) => void): RenderMarkdown {
	return (element, markdown) => {
		const page = element.ownerDocument;
		element.replaceChildren(...markdown.split(PARAGRAPH_BREAK).map((paragraph) => paragraphOf(page, paragraph)));
		const pressed = tabPressOf(page, showTab);
		element.addEventListener("click", pressed);
		return () => {
			element.removeEventListener("click", pressed);
			element.replaceChildren();
		};
	};
}

function tabPressOf(page: Document, showTab: (tabId: string) => void): (event: MouseEvent) => void {
	return (event) => {
		const view = page.defaultView;
		const link =
			view !== null && event.target instanceof view.Element ? event.target.closest(`a[${TAB_ATTRIBUTE}]`) : null;
		const tabId = link?.getAttribute(TAB_ATTRIBUTE) ?? null;

		if (tabId === null) {
			return;
		}

		event.preventDefault();
		showTab(tabId);
	};
}

function paragraphOf(page: Document, text: string): HTMLParagraphElement {
	const paragraph = page.createElement("p");
	let at = 0;

	for (const found of text.matchAll(TAB_LINK)) {
		paragraph.append(...linesOf(page, text.slice(at, found.index)), linkOf(page, found[1] ?? "", found[2] ?? ""));
		at = found.index + found[0].length;
	}

	paragraph.append(...linesOf(page, text.slice(at)));
	return paragraph;
}

function linesOf(page: Document, text: string): readonly Node[] {
	return text
		.split("\n")
		.flatMap((line, at) =>
			at === 0 ? [page.createTextNode(line)] : [page.createElement("br"), page.createTextNode(line)],
		);
}

function linkOf(page: Document, label: string, tabId: string): HTMLAnchorElement {
	const link = page.createElement("a");
	link.href = "#";
	link.setAttribute(TAB_ATTRIBUTE, tabId);
	link.textContent = label;
	return link;
}
