import { createElement as h } from "react";
import type { ReactElement } from "react";
import { NO_ASSISTANT } from "../packages/shared/core/src/engine/assistant-port.ts";
import { transcriptSessionOf } from "../apps/tauri/src/assistant/agent-transcript.ts";
import { chatOf } from "../plugins/ai/agent/data/assistant/features/chat/lib/chat-of.ts";
import { labelledFaceOf } from "../plugins/ai/agent/data/assistant/features/chat/lib/labelled-face.ts";
import { ReadOnlyChat } from "../plugins/ai/chat/src/features/assistant/ui/read-only-chat/read-only-chat.tsx";
import { Plate } from "../apps/studio/src/features/plate/ui/plate/plate.tsx";
import type { PaneBoardProps } from "../plugins/sumi-host/src/index.ts";

const TRANSCRIPT = [
	{ type: "user", message: { role: "user", content: "Align the composer edges and make send round." } },
	{
		type: "assistant",
		message: {
			content: [{ type: "text", text: "The send button is now round and sits the same distance from both edges." }],
		},
	},
]
	.map((line) => JSON.stringify(line))
	.join("\n");

const SESSION = transcriptSessionOf(TRANSCRIPT, false);
const CHAT = chatOf({
	isAvailable: true,
	session: SESSION,
	cards: NO_ASSISTANT.cardsOf(SESSION),
	faces: SESSION.turns.map((turn) =>
		turn.calls.map((call) => ({ ...labelledFaceOf(call, NO_ASSISTANT.describeCall(call), null), view: null })),
	),
});

const NO_HEAD = { edgeStart: null, lead: null, crumb: null, more: null, edgeEnd: null };

export const drawnPlate: PaneBoardProps["drawn"] = (view): ReactElement => {
	if (view.kind === "chat") {
		return (
			<Plate side="chat" label="Chat" {...NO_HEAD}>
				<ReadOnlyChat chat={CHAT} />
			</Plate>
		);
	}

	return (
		<Plate side="app" label="App" {...NO_HEAD}>
			<div />
		</Plate>
	);
};
