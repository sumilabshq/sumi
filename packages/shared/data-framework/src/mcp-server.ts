import { z } from "zod";
import { reasonOf } from "./answer";
import type { Exposed } from "./exposure";
import { toolResultOf } from "./mcp-content";
import type { ToolResult } from "./mcp-content";
import { inputOf, servedToolsOf, toolsOf } from "./mcp-tools";
import type { McpTool, ServedTool } from "./mcp-tools";
import type { Runtime } from "./runtime";

interface InitializeResult {
	readonly protocolVersion: string;
	readonly capabilities: { readonly tools: Readonly<Record<string, never>> };
	readonly serverInfo: {
		readonly name: string;
		readonly version: string;
	};
}

type McpResult =
	InitializeResult | ToolResult | { readonly tools: readonly McpTool[] } | Readonly<Record<string, never>>;

type JsonRpcOutcome =
	| { readonly result: McpResult }
	| {
			readonly error: {
				readonly code: number;
				readonly message: string;
			};
	  };

export type McpReply = {
	readonly jsonrpc: "2.0";
	readonly id: string | number | null;
} & JsonRpcOutcome;

export interface McpServer {
	readonly name: string;
	readonly tools: readonly McpTool[];
	answer(message: unknown): Promise<McpReply | null>;
}

interface ServedTools {
	readonly name: string;
	readonly exposed: Exposed;
	readonly tools: ReadonlyMap<string, ServedTool>;
	readonly listed: readonly McpTool[];
}

const ADAPTER = "mcpServerOf({server})";
const SERVER_VERSION = "0.1.0";
const SUPPORTED_PROTOCOLS: readonly string[] = ["2025-06-18", "2025-03-26", "2024-11-05"];
const FALLBACK_PROTOCOL = "2025-06-18";
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;
const NOT_A_MESSAGE = "An MCP message is a JSON-RPC object with a method.";
const UNKNOWN_METHOD = "The MCP server {server} does not know the method {method}.";
const NOT_A_TOOL_CALL = "tools/call takes { name, arguments }.";
const UNKNOWN_TOOL = "The MCP server {server} has no tool {tool}.";
const NOT_ANSWERED = "[mcp] {server}: tool {tool} threw instead of answering: {reason}";

const MessageSchema = z.object({
	id: z.union([z.string(), z.number()]).optional(),
	method: z.string(),
	params: z.unknown().optional(),
});

const InitializeSchema = z.object({ protocolVersion: z.string() });

const ToolCallSchema = z.object({
	name: z.string(),
	arguments: z.record(z.string(), z.unknown()).default({}),
});

export function mcpServerOf(runtime: Runtime, { name }: { readonly name: string }): McpServer {
	const exposed = runtime.expose({ adapter: ADAPTER.replace("{server}", name) });
	const tools = servedToolsOf(exposed.requests);
	const served = {
		name,
		exposed,
		tools,
		listed: toolsOf(tools),
	};
	return {
		name,
		tools: served.listed,
		answer: (message) => replyTo(served, message),
	};
}

async function replyTo(served: ServedTools, message: unknown): Promise<McpReply | null> {
	const parsed = MessageSchema.safeParse(message);

	if (!parsed.success) {
		return {
			jsonrpc: "2.0",
			id: null,
			...errorOutcomeOf(INVALID_REQUEST, NOT_A_MESSAGE),
		};
	}

	const { id, method, params } = parsed.data;

	if (id === undefined) {
		return null;
	}

	return {
		jsonrpc: "2.0",
		id,
		...(await outcomeOf(served, method, params)),
	};
}

async function outcomeOf(served: ServedTools, method: string, params: unknown): Promise<JsonRpcOutcome> {
	switch (method) {
		case "initialize":
			return { result: initializeResultOf(served.name, params) };
		case "ping":
			return { result: {} };
		case "tools/list":
			return { result: { tools: served.listed } };
		case "tools/call":
			return toolCallOutcomeOf(served, params);
		default:
			return errorOutcomeOf(
				METHOD_NOT_FOUND,
				UNKNOWN_METHOD.replace("{server}", served.name).replace("{method}", method),
			);
	}
}

function initializeResultOf(name: string, params: unknown): InitializeResult {
	return {
		protocolVersion: protocolOf(params),
		capabilities: { tools: {} },
		serverInfo: {
			name,
			version: SERVER_VERSION,
		},
	};
}

function protocolOf(params: unknown): string {
	const asked = InitializeSchema.safeParse(params);

	if (!asked.success || !SUPPORTED_PROTOCOLS.includes(asked.data.protocolVersion)) {
		return FALLBACK_PROTOCOL;
	}

	return asked.data.protocolVersion;
}

async function toolCallOutcomeOf(served: ServedTools, params: unknown): Promise<JsonRpcOutcome> {
	const call = ToolCallSchema.safeParse(params);

	if (!call.success) {
		return errorOutcomeOf(INVALID_PARAMS, NOT_A_TOOL_CALL);
	}

	const tool = served.tools.get(call.data.name);

	if (tool === undefined) {
		return errorOutcomeOf(
			INVALID_PARAMS,
			UNKNOWN_TOOL.replace("{server}", served.name).replace("{tool}", call.data.name),
		);
	}

	try {
		const answered = await served.exposed.answer({
			name: tool.requestName,
			input: inputOf(tool, call.data.arguments),
			// TRADE-OFF: MCP carries no idempotency key, so each tools/call is a new command
			idempotencyKey: tool.isCommand ? crypto.randomUUID() : null,
			signal: new AbortController().signal,
		});
		return { result: toolResultOf(answered) };
	} catch (thrown) {
		const reason = reasonOf(thrown);
		console.error(
			NOT_ANSWERED.replace("{server}", served.name).replace("{tool}", call.data.name).replace("{reason}", reason),
		);
		return errorOutcomeOf(INTERNAL_ERROR, reason);
	}
}

function errorOutcomeOf(code: number, message: string): JsonRpcOutcome {
	return {
		error: {
			code,
			message,
		},
	};
}
