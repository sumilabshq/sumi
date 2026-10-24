import { createElement as h } from "react";
import type { ReactNode } from "react";
import { useCommand } from "@widgetarium/core/requests";
import type { Chat } from "../../schema/chat.schema.js";
import { RetryTurnCommand } from "../../../features/chat/contract.js";
import { FinishLine } from "../../../features/chat/ui/finish-line/finish-line.js";
import { FailureCard } from "../failure-card/failure-card.js";

const RETRY = "Try again";
const RUN_FAILED = "The answer did not finish";
const NOT_COMPACTED = "The chat was not compacted";

export function EndLine({ chat }: { readonly chat: Chat }): ReactNode {
	const retryTurn = useCommand(RetryTurnCommand);
	const { session } = chat;
	const last = session.turns.at(-1);

	if (session.failure) {
		return (
			<FailureCard
				title={last?.role === "compact" ? NOT_COMPACTED : RUN_FAILED}
				reason={session.failure}
				action={{ said: RETRY, run: () => void retryTurn.run() }}
			/>
		);
	}

	if (session.busy || last?.role !== "agent" || !last.outcome) {
		return null;
	}

	return <FinishLine turn={last} outcome={last.outcome} copyText={copiedToClipboard} />;
}

function copiedToClipboard(text: string): Promise<void> {
	return navigator.clipboard.writeText(text);
}
