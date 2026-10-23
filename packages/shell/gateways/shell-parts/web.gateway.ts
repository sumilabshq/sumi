import { localPxMemory } from "@widgetarium/behaviors";
import { shellPartsOf } from "./shell-parts.gateway.js";
import type { ShellParts } from "./shell-parts.gateway.js";

const LEFT_WIDTH_KEY = "widgetarium-studio-left-px";
const CHAT_WIDTH_KEY = "widgetarium-studio-chat-px";

export function webShellParts(): ShellParts {
	return shellPartsOf({
		left: localPxMemory(LEFT_WIDTH_KEY),
		chat: localPxMemory(CHAT_WIDTH_KEY),
	});
}
