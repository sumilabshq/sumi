import { createElement as h } from "react";
import type { ReactNode } from "react";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { LiveGroup } from "../live-group/live-group.js";
import type { LiveTools } from "../../lib/live-tools.js";

export interface LiveRowProps {
	readonly live: LiveTools;
	readonly session: AssistantSession;
	readonly chatId?: string | undefined;
}

export function LiveRow({ live, session, chatId }: LiveRowProps): ReactNode {
	if (!live.isShown) {
		return null;
	}

	return <LiveGroup key={live.groupKey} calls={live.calls} faces={live.faces} session={session} chatId={chatId} />;
}
