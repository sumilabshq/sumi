import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { NO_ASSISTANT } from "../packages/shared/core/src/engine/assistant-port.ts";
import { RuntimeProvider, runtime } from "../packages/shared/data-framework/src/index.ts";
import { transcriptSessionOf } from "../apps/tauri/src/assistant/agent-transcript.ts";
import { chatOf } from "../plugins/ai/agent/data/assistant/features/chat/lib/chat-of.ts";
import { labelledFaceOf } from "../plugins/ai/agent/data/assistant/features/chat/lib/labelled-face.ts";
import { ReadOnlyChat } from "../plugins/ai/chat/src/features/assistant/ui/read-only-chat/read-only-chat.tsx";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const transcript = String(Reflect.get(window, "AGENT_TRANSCRIPT") ?? "");
const session = transcriptSessionOf(transcript, false);
const chat = chatOf({
	isAvailable: true,
	session,
	cards: NO_ASSISTANT.cardsOf(session),
	faces: session.turns.map((turn) =>
		turn.calls.map((call) => ({ ...labelledFaceOf(call, NO_ASSISTANT.describeCall(call), null), view: null })),
	),
});
const started = runtime().start({ platform: "web", scope: {} });

function Demo(): ReactElement {
	return (
		<RuntimeProvider runtime={started}>
			<div className="wg-chat-app sumi-agent-chat">
				<div className="sumi-agent-chat-head">
					<span className="sumi-agent-chat-title">Run sleep then echo</span>
					<span className="sumi-agent-chat-mode">read only</span>
				</div>
				<ReadOnlyChat chat={chat} />
			</div>
		</RuntimeProvider>
	);
}

const root = document.getElementById("root");
if (root !== null) {
	createRoot(root).render(<Demo />);
}
