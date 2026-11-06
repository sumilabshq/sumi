import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { isObject } from "@widgetarium/framework/is-object";
import { hostObject } from "@widgetarium/framework";

export const AssistantHost = hostObject<AssistantPort>("AssistantPort", isAssistantPort);

function isAssistantPort(held: unknown): held is AssistantPort {
	return isObject(held) && typeof held["can"] === "boolean" && typeof held["session"] === "function";
}
