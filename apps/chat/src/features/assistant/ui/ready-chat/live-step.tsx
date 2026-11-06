import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Chat } from "@widgetarium/assistant";
import { RunningCall } from "../running-call/running-call.js";
import { Working } from "../working/working.js";

export function LiveStep({ chat }: { readonly chat: Chat }): ReactElement {
	const running = chat.runningCall;

	if (!running || !chat.runningFace) {
		return <Working session={chat.session} />;
	}

	return <RunningCall call={running} face={chat.runningFace} />;
}
