import { Channel, invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type { StartedApp } from "@widgetarium/core/requests";
import { runAgentTool } from "./run-agent-tool.js";
import type { QueueTaker } from "./tool-places.js";

const OPEN_CHANNEL = "plugin:agent|open_channel";
const ANSWER = "plugin:agent|answer";

const AgentAskSchema = z.object({
	id: z.number().int(),
	chat: z.string(),
	tool: z.string(),
	input: z.record(z.string(), z.unknown()),
});

type AgentAsk = z.infer<typeof AgentAskSchema>;

export function openAgentTools(app: StartedApp, queue: QueueTaker): void {
	const channel = new Channel<unknown>((message) => void answerAsk({ app, queue }, message));
	invoke(OPEN_CHANNEL, { onEvent: channel }).catch((failure: unknown) =>
		console.error("[agent] the agent tools channel did not open", failure),
	);
}

async function answerAsk({ app, queue }: { readonly app: StartedApp; readonly queue: QueueTaker }, message: unknown): Promise<void> {
	const parsed = AgentAskSchema.safeParse(message);

	if (!parsed.success) {
		console.error("[agent] a tool call the app cannot read was dropped", parsed.error.message);
		return;
	}

	const asked = parsed.data;

	try {
		const value = await runAgentTool({ app, chatId: asked.chat, queue }, asked.tool, asked.input);
		await invoke(ANSWER, { id: asked.id, ok: true, value });
	} catch (failure) {
		await refuseAsk(asked, failure);
	}
}

async function refuseAsk(asked: AgentAsk, failure: unknown): Promise<void> {
	const error = failure instanceof Error ? failure.message : String(failure);
	console.error(`[agent] ${asked.tool} for chat ${asked.chat} failed: ${error}`);
	await invoke(ANSWER, { id: asked.id, ok: false, error });
}
