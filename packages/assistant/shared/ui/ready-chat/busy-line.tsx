import { createElement as h } from "react";
import type { ReactNode } from "react";
import { useCommand } from "@widgetarium/core/requests";
import type { Chat } from "../../schema/chat.schema.js";
import { StopTurnCommand } from "../../../features/chat/contract.js";
import { runningCallOf } from "../../../features/chat/lib/running-call-of.js";
import { RunningCall } from "../../../features/chat/ui/running-call/running-call.js";
import { Working } from "../../../features/chat/ui/working/working.js";

export function BusyLine({ chat }: { readonly chat: Chat }): ReactNode {
	const stopTurn = useCommand(StopTurnCommand);
	const running = runningCallOf(chat.session);

	if (!chat.session.busy || chat.session.turns.at(-1)?.role === "compact") {
		return null;
	}

	if (!running || !chat.runningFace) {
		return <Working session={chat.session} />;
	}

	return <RunningCall call={running} face={chat.runningFace} onStop={() => void stopTurn.run()} />;
}
