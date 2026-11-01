import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";
import { markdownNodesOf } from "./markdown-blocks.js";

export const renderMarkdown: RenderMarkdown = (element, markdown) => {
	element.replaceChildren(...markdownNodesOf(element.ownerDocument, markdown));
	return () => element.replaceChildren();
};
