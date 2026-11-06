import { createElement as h } from "react";
import type { ReactNode } from "react";
import { RunningCall } from "../running-call/running-call.js";
import { Working } from "../working/working.js";
import type { Chat } from "@widgetarium/assistant";

export function BusyLine({ chat }: { readonly chat: Chat }): ReactNode {
	const running = chat.runningCall;

	if (!chat.session.busy || chat.session.turns.at(-1)?.role === "compact") {
		return null;
	}

	if (!running || !chat.runningFace) {
		return <Working session={chat.session} />;
	}

	return <RunningCall call={running} face={chat.runningFace} />;
}
