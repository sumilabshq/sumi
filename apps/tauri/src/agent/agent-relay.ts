import { Channel, invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type { McpServer } from "@widgetarium/data-framework";
import { DomProbeAskSchema, answerDomProbe } from "./dom-probe.js";

interface QueueTaker {
	readonly handQueueToAgent: (chatId: string) => string | null;
}

export type LinkOpener = (href: string, opensNew: boolean) => Promise<string | null>;

const OPEN_CHANNEL = "plugin:agent|open_channel";
const ANSWER = "plugin:agent|answer";
const NO_SERVER = "Sumi serves no MCP server named {server} in this window.";
const UNREADABLE_ASK = "The window could not read this ask: {reason}";
const FAILED_WITHOUT_REASON = "The window failed this ask and gave no reason.";
const OPENED = "[agent] relay none → open, MCP servers: {servers}";

const McpAskSchema = z.object({
	id: z.number().int(),
	kind: z.literal("mcp"),
	server: z.string(),
	headers: z.record(z.string(), z.string()),
	message: z.unknown(),
});

const BetweenStepsAskSchema = z.object({
	id: z.number().int(),
	kind: z.literal("between-steps"),
	chat: z.string(),
});

const OpenAskSchema = z.object({
	id: z.number().int(),
	kind: z.literal("open"),
	href: z.string().min(1).max(2048),
	opensNew: z.boolean().default(false),
});

const RelayAskSchema = z.discriminatedUnion("kind", [McpAskSchema, BetweenStepsAskSchema, OpenAskSchema, DomProbeAskSchema]);

const AskIdSchema = z.object({ id: z.number().int() });

type RelayAsk = z.infer<typeof RelayAskSchema>;

interface Relayed {
	readonly servers: ReadonlyMap<string, McpServer>;
	readonly queue: QueueTaker;
	readonly opensLink: LinkOpener;
}

export interface RelayReach {
	readonly queue: QueueTaker;
	readonly opensLink: LinkOpener;
}

export function openAgentRelay(servers: readonly McpServer[], { queue, opensLink }: RelayReach): void {
	const relayed = {
		servers: new Map(servers.map((server) => [server.name, server])),
		queue,
		opensLink,
	};
	const channel = new Channel<unknown>((message) => void answerAsk(relayed, message));
	const names = [...relayed.servers.keys()];
	invoke(OPEN_CHANNEL, { onEvent: channel, servers: names })
		.then(() => console.info(OPENED.replace("{servers}", names.join(", "))))
		.catch((failure: unknown) => console.error("[agent] relay none → closed: the channel did not open", failure));
}

async function answerAsk(relayed: Relayed, message: unknown): Promise<void> {
	const parsed = RelayAskSchema.safeParse(message);

	if (!parsed.success) {
		await refuseUnreadable(message, parsed.error.message);
		return;
	}

	try {
		await answerWith({ id: parsed.data.id, ok: true, value: await valueOf(relayed, parsed.data) });
	} catch (failure) {
		const reason = failure instanceof Error ? failure.message : String(failure);
		console.error(`[agent] ${parsed.data.kind} ask ${parsed.data.id} failed: ${reason}`);
		await answerWith({ id: parsed.data.id, ok: false, error: reason === "" ? FAILED_WITHOUT_REASON : reason });
	}
}

async function refuseUnreadable(message: unknown, reason: string): Promise<void> {
	const asked = AskIdSchema.safeParse(message);
	console.error("[agent] an ask the window cannot read was refused", reason);

	if (!asked.success) {
		return;
	}

	await answerWith({ id: asked.data.id, ok: false, error: UNREADABLE_ASK.replace("{reason}", reason) });
}

async function answerWith(answer: Readonly<Record<string, unknown>>): Promise<void> {
	try {
		await invoke(ANSWER, answer);
	} catch (failure) {
		console.error("[agent] an answer did not reach the agent hub", failure);
	}
}

async function valueOf({ servers, queue, opensLink }: Relayed, asked: RelayAsk): Promise<unknown> {
	switch (asked.kind) {
		case "between-steps":
			return { text: queue.handQueueToAgent(asked.chat) ?? "" };
		case "mcp":
			return answerOfServer(servers, asked);
		case "open":
			return openedLink(opensLink, asked);
		case "dom":
			return answerDomProbe(asked);
	}
}

async function openedLink(opensLink: LinkOpener, asked: z.infer<typeof OpenAskSchema>): Promise<unknown> {
	const refusal = await opensLink(asked.href, asked.opensNew);

	if (refusal !== null) {
		throw new Error(refusal);
	}

	return { opened: asked.href };
}

function answerOfServer(
	servers: ReadonlyMap<string, McpServer>,
	asked: z.infer<typeof McpAskSchema>,
): Promise<unknown> {
	const server = servers.get(asked.server);

	if (server === undefined) {
		throw new Error(NO_SERVER.replace("{server}", asked.server));
	}

	return server.answer(asked.message, { headers: new Headers(asked.headers) });
}
