import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { LINK_ICON_CLASS, TAB_ATTRIBUTE, linkIconOf, markdownNodesOf } from "./markdown-blocks.js";

export type TabFaviconOf = (tabId: string) => Promise<string | null>;

export function tabLinksRenderer(tabFaviconOf?: TabFaviconOf): RenderMarkdown {
	return (element, markdown) => {
		element.replaceChildren(...markdownNodesOf(element.ownerDocument, markdown));

		if (tabFaviconOf !== undefined) {
			showTabFavicons(element, tabFaviconOf);
		}

		return () => {
			element.replaceChildren();
		};
	};
}

function showTabFavicons(element: HTMLElement, tabFaviconOf: TabFaviconOf): void {
	for (const link of element.querySelectorAll(`a[${TAB_ATTRIBUTE}]`)) {
		const tabId = link.getAttribute(TAB_ATTRIBUTE) ?? "";
		void tabFaviconOf(tabId).then((favicon) => {
			if (favicon === null) {
				return;
			}

			link.querySelector(`.${LINK_ICON_CLASS}`)?.replaceWith(linkIconOf(element.ownerDocument, favicon));
		});
	}
}
