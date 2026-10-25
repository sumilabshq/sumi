import { Channel, invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import { AppTabsQuery, TabsSidebarQuery } from "@widgetarium/app-host";
import { ChatListQuery } from "@widgetarium/workspaces";
import type { StartedApp } from "@widgetarium/core/requests";
import { AppStateInputSchema, appStateOf } from "./app-state.js";
import type { AppState } from "./app-state.js";

type ToolInput = Readonly<Record<string, unknown>>;
type Tool = (app: StartedApp, chatId: string, input: ToolInput) => Promise<unknown>;

const OPEN_CHANNEL = "plugin:agent|open_channel";
const ANSWER = "plugin:agent|answer";
const UNKNOWN_TOOL = "Sumi has no tool named {tool}.";
const BAD_INPUT = "The {tool} input is not what the tool takes: {reason}";

const AgentAskSchema = z.object({
	id: z.number().int(),
	chat: z.string(),
	tool: z.string(),
	input: z.record(z.string(), z.unknown()),
});

type AgentAsk = z.infer<typeof AgentAskSchema>;

const TOOLS: Readonly<Record<string, Tool>> = {
	app_state: appStateTool,
};

export function openAgentTools(app: StartedApp): void {
	const channel = new Channel<unknown>((message) => void answerAsk(app, message));
	invoke(OPEN_CHANNEL, { onEvent: channel }).catch((failure: unknown) =>
		console.error("[agent] the agent tools channel did not open", failure),
	);
}

async function answerAsk(app: StartedApp, message: unknown): Promise<void> {
	const parsed = AgentAskSchema.safeParse(message);
	if (!parsed.success) {
		console.error("[agent] a tool call the app cannot read was dropped", parsed.error.message);
		return;
	}

	const asked = parsed.data;
	try {
		const value = await run(app, asked);
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

function run(app: StartedApp, asked: AgentAsk): Promise<unknown> {
	const tool = TOOLS[asked.tool];
	if (tool === undefined) {
		throw new Error(UNKNOWN_TOOL.replace("{tool}", asked.tool));
	}

	return tool(app, asked.chat, asked.input);
}

async function outputOf<T>(asked: Promise<{ ok: true; output: T } | { ok: false; reason: string }>): Promise<T> {
	const answer = await asked;
	if (!answer.ok) {
		throw new Error(answer.reason);
	}

	return answer.output;
}

async function appStateTool(app: StartedApp, chatId: string, input: ToolInput): Promise<AppState> {
	const asked = AppStateInputSchema.safeParse(input);
	if (!asked.success) {
		throw new Error(BAD_INPUT.replace("{tool}", "app_state").replace("{reason}", z.prettifyError(asked.error)));
	}

	const [sidebar, chats, tabs] = await Promise.all([
		outputOf(app.send(TabsSidebarQuery)),
		outputOf(app.send(ChatListQuery)),
		outputOf(app.send(AppTabsQuery)),
	]);
	return appStateOf({ sidebar, chats, tabs }, chatId, asked.data);
}
