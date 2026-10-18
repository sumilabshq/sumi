import type { AssistantCall, AssistantSession } from "@widgetarium/core/engine/assistant-port.js";

export function runningCallOf(session: AssistantSession): AssistantCall | null {
	if (!session.busy) {
		return null;
	}

	const last = session.turns.at(-1)?.calls.at(-1);
	return last && !last.answered ? last : null;
}
