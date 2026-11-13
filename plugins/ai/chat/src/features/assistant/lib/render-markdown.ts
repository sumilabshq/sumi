import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { CHAT_LOOK, OPENED_LIVE_ATTRIBUTE, markdownNodesOf, openCutsIn } from "@widgetarium/markdown";

export const renderMarkdown: RenderMarkdown = (element, markdown) => {
	element.replaceChildren(...markdownNodesOf(element.ownerDocument, markdown, CHAT_LOOK));

	if (element.hasAttribute(OPENED_LIVE_ATTRIBUTE)) {
		openCutsIn(element);
	}

	return () => element.replaceChildren();
};
