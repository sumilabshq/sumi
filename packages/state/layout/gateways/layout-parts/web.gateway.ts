import { localFlagMemory, localJsonMemory, localPxMemory } from "@widgetarium/behaviors";
import type { PaneTree } from "../../shared/schema/pane-tree.schema.js";
import { layoutPartsOf } from "./memory.gateway.js";
import type { LayoutParts } from "./layout-parts.gateway.js";

const LEFT_WIDTH_KEY = "widgetarium-studio-left-px";
const CHAT_WIDTH_KEY = "widgetarium-studio-chat-px";
const LEFT_HIDDEN_KEY = "widgetarium-studio-left-hidden";
const PANES_KEY = "widgetarium-studio-panes:{workspaceId}";

export function webLayoutParts(workspaceId: string): LayoutParts {
	return layoutPartsOf({
		widths: {
			left: localPxMemory(LEFT_WIDTH_KEY),
			chat: localPxMemory(CHAT_WIDTH_KEY),
		},
		sides: {
			left: localFlagMemory(LEFT_HIDDEN_KEY),
		},
		panes: localJsonMemory<PaneTree>(PANES_KEY.replace("{workspaceId}", () => workspaceId)),
	});
}
