import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { markdownNodesOf } from "./markdown-blocks.js";
import { OPENED_LIVE_ATTRIBUTE, openCutsIn } from "./more-toggle.js";

export const renderMarkdown: RenderMarkdown = (element, markdown) => {
	element.replaceChildren(...markdownNodesOf(element.ownerDocument, markdown));

	if (element.hasAttribute(OPENED_LIVE_ATTRIBUTE)) {
		openCutsIn(element);
	}

	return () => element.replaceChildren();
};
