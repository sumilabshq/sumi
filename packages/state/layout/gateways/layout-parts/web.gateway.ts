import { localPxMemory } from "@widgetarium/behaviors";
import { layoutPartsOf } from "./memory.gateway.js";
import type { LayoutParts } from "./layout-parts.gateway.js";

const LEFT_WIDTH_KEY = "widgetarium-studio-left-px";
const CHAT_WIDTH_KEY = "widgetarium-studio-chat-px";

export function webLayoutParts(): LayoutParts {
	return layoutPartsOf({
		widths: {
			left: localPxMemory(LEFT_WIDTH_KEY),
			chat: localPxMemory(CHAT_WIDTH_KEY),
		},
	});
}
