import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";

export const AssistantHost = hostObject<AssistantPort>("AssistantPort", isAssistantPort);

function isAssistantPort(held: unknown): held is AssistantPort {
	return isObject(held) && typeof held["can"] === "boolean" && typeof held["session"] === "function";
}
