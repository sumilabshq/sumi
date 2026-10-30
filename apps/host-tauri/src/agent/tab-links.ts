import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { TAB_ATTRIBUTE, markdownNodesOf } from "./markdown-blocks.js";

export function tabLinksRenderer(showTab: (tabId: string) => void): RenderMarkdown {
	return (element, markdown) => {
		const page = element.ownerDocument;
		element.replaceChildren(...markdownNodesOf(page, markdown));
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
