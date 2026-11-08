import { z } from "zod";
import {
	Anywhere,
	Authenticate,
	AuthenticatedGuard,
	PublicGuard,
	Repeatable,
	command,
	event,
	mcpServerOf,
	module,
	named,
	query,
	refuse,
	runtime,
} from "../packages/shared/data-framework/src/index.ts";
import type { User } from "../packages/shared/data-framework/src/index.ts";
import { check, tally, thrownBy } from "./check-helpers.ts";

class Counter {
	value = 0;
}

type TallyParts = { readonly counter: Counter };

const ON_SERVER = {
	platform: "server",
	env: {},
	scope: { workspaceId: "mcp-workspace" },
} as const;

const count = named("board.count", query<TallyParts>())
	.public()
	.metadata({ description: "How far the counter went." })
	.output(z.number())
	.handle((_input, { counter }) => counter.value);

const bump = named("board.bump", command<TallyParts>())
	.public()
	.input(z.object({ by: z.number().describe("Steps to add.") }))
	.output(z.number())
	.idempotencyKey(Repeatable)
	.handle(({ by }, { counter }) => {
		counter.value += by;
		return counter.value;
	});

const echo = named("board.echo", query<TallyParts>())
	.public()
	.input(z.string())
	.output(z.string())
	.handle((said) => said);

const refuseAlways = named("board.refuse-always", command<TallyParts>())
	.public()
	.idempotencyKey(Repeatable)
	.handle(() => refuse("never today"));

const shot = named("board.shot", query<TallyParts>())
	.public()
	.output(z.object({ png: z.string(), width: z.number() }))
	.handle(() => ({ png: "iVBOR", width: 2 }));

const hidden = named("board.hidden", query<TallyParts>())
	.output(z.number())
	.handle(() => 0);

const other = named("shelf.other", query())
	.public()
	.output(z.number())
	.handle(() => 7);

const started = runtime()
	.modules(
		module("tally")
			.on(Anywhere)
			.guard(PublicGuard)
			.provide(() => ({ counter: new Counter() }))
			.handles([count, bump, echo, refuseAlways, shot, hidden]),
		module("shelf")
			.on(Anywhere)
			.guard(PublicGuard)
			.provide(() => ({}))
			.handles([other]),
	)
	.start(ON_SERVER);
const tally$ = mcpServerOf(started, { name: "tally" });

function call(id: number, method: string, params?: unknown): Promise<unknown> {
	return tally$.answer({
		jsonrpc: "2.0",
		id,
		method,
		params,
	});
}

check("metadata: a request keeps its fields", count.request.metadata(), { description: "How far the counter went." });
check("metadata: a second call merges", query().metadata({ a: 1 }).metadata({ b: 2 }).metadata(), { a: 1, b: 2 });
check("metadata: none is an empty object", query().metadata(), {});
check("metadata: an event keeps its fields", event().metadata({ http: "doc" }).metadata(), { http: "doc" });
check(
	"metadata: an array is refused",
	thrownBy(() => query().metadata([] as unknown as Record<string, unknown>)),
	'a query.metadata() takes an object of fields, such as { description: "…" }',
);

check("server: named as asked", tally$.name, "tally");
check(
	"tools: every module's public requests of the runtime, full name with dots as underscores",
	tally$.tools.map(({ name }) => name).sort(),
	[
		"shelf_shelf_other",
		"tally_board_bump",
		"tally_board_count",
		"tally_board_echo",
		"tally_board_refuse-always",
		"tally_board_shot",
	],
);
check(
	"tools: description comes from metadata",
	tally$.tools.find(({ name }) => name === "tally_board_count")?.description,
	"How far the counter went.",
);
check(
	"tools: no input is an empty object schema",
	tally$.tools.find(({ name }) => name === "tally_board_count")?.inputSchema,
	{ type: "object", properties: {} },
);
check(
	"tools: an object input keeps its fields and their descriptions",
	tally$.tools.find(({ name }) => name === "tally_board_bump")?.inputSchema,
	{
		type: "object",
		properties: { by: { type: "number", description: "Steps to add." } },
		required: ["by"],
	},
);
check(
	"tools: a non-object input is wrapped in { input }",
	tally$.tools.find(({ name }) => name === "tally_board_echo")?.inputSchema,
	{ type: "object", properties: { input: { type: "string" } }, required: ["input"] },
);

check(
	"initialize: echoes the protocol and names the server",
	await call(1, "initialize", { protocolVersion: "2025-03-26" }),
	{
		jsonrpc: "2.0",
		id: 1,
		result: {
			protocolVersion: "2025-03-26",
			capabilities: { tools: {} },
			serverInfo: { name: "tally", version: "0.1.0" },
		},
	},
);
check("ping: an empty result", await call(2, "ping"), { jsonrpc: "2.0", id: 2, result: {} });
check(
	"a notification gets no reply",
	await tally$.answer({ jsonrpc: "2.0", method: "notifications/initialized" }),
	null,
);
check(
	"tools/list: the same tools",
	await call(3, "tools/list").then((reply) => JSON.stringify(reply).includes('"tally_board_shot"')),
	true,
);
check(
	"tools/call: a command runs and answers its output",
	await call(4, "tools/call", { name: "tally_board_bump", arguments: { by: 3 } }),
	{ jsonrpc: "2.0", id: 4, result: { content: [{ type: "text", text: "3" }] } },
);
check("tools/call: a query reads what the command wrote", await call(5, "tools/call", { name: "tally_board_count" }), {
	jsonrpc: "2.0",
	id: 5,
	result: { content: [{ type: "text", text: "3" }] },
});
check(
	"tools/call: a wrapped input is unwrapped",
	await call(6, "tools/call", { name: "tally_board_echo", arguments: { input: "hi" } }),
	{ jsonrpc: "2.0", id: 6, result: { content: [{ type: "text", text: '"hi"' }] } },
);
check(
	"tools/call: a refusal is a tool error with its reason",
	await call(7, "tools/call", { name: "tally_board_refuse-always" }),
	{ jsonrpc: "2.0", id: 7, result: { content: [{ type: "text", text: "never today" }], isError: true } },
);
check("tools/call: a png in the output becomes an image", await call(8, "tools/call", { name: "tally_board_shot" }), {
	jsonrpc: "2.0",
	id: 8,
	result: {
		content: [
			{ type: "image", data: "iVBOR", mimeType: "image/png" },
			{ type: "text", text: '{\n\t"width": 2\n}' },
		],
	},
});
check(
	"tools/call: bad input is a tool error, not a crash",
	await call(9, "tools/call", { name: "tally_board_bump", arguments: { by: "x" } }).then((reply) =>
		JSON.stringify(reply).includes('"isError":true'),
	),
	true,
);
check("tools/call: an unknown tool is a JSON-RPC error", await call(10, "tools/call", { name: "tally_board_nope" }), {
	jsonrpc: "2.0",
	id: 10,
	error: { code: -32602, message: "The MCP server tally has no tool tally_board_nope." },
});
check("an unknown method is a JSON-RPC error", await call(11, "resources/list"), {
	jsonrpc: "2.0",
	id: 11,
	error: { code: -32601, message: "The MCP server tally does not know the method resources/list." },
});
check("a message with no method is an invalid request", await tally$.answer({ id: 12 }), {
	jsonrpc: "2.0",
	id: null,
	error: { code: -32600, message: "An MCP message is a JSON-RPC object with a method." },
});

check(
	"initialize: an unknown protocol answers the one this server speaks",
	await call(13, "initialize", { protocolVersion: "1999-01-01" }).then((reply) =>
		JSON.stringify(reply).includes('"protocolVersion":"2025-06-18"'),
	),
	true,
);

const tooLong = named(`board.${"x".repeat(70)}`, query())
	.public()
	.output(z.number())
	.handle(() => 0);
const longRuntime = runtime()
	.modules(
		module("lengthy")
			.on(Anywhere)
			.guard(PublicGuard)
			.provide(() => ({}))
			.handles([tooLong]),
	)
	.start(ON_SERVER);
check(
	"a tool name past 64 characters is refused, naming the request",
	thrownBy(() => mcpServerOf(longRuntime, { name: "lengthy" })).startsWith(
		`lengthy.board.${"x".repeat(70)} becomes the MCP tool lengthy_board_`,
	),
	true,
);

class ChatHeaderAuthenticate extends Authenticate {
	userOf(headers: Headers): Promise<User | null> {
		const chat = headers.get("sumi-chat");
		return Promise.resolve(chat === null ? null : { id: chat, permissions: [] });
	}
}

const whoAsks = named("asking.who", query())
	.public()
	.output(z.string())
	.handle((_input, { user }) => user?.id ?? "nobody");
const askingRuntime = runtime()
	.modules(
		module("asking")
			.on(Anywhere)
			.guard(AuthenticatedGuard)
			.provide(() => ({}))
			.handles([whoAsks]),
		module("shelf")
			.on(Anywhere)
			.guard(PublicGuard)
			.provide(() => ({}))
			.handles([other]),
	)
	.start(ON_SERVER);
const asking = mcpServerOf(askingRuntime, {
	name: "asking",
	modules: ["asking"],
	authenticate: new ChatHeaderAuthenticate(),
});
check(
	"modules: only the named modules' requests become tools",
	asking.tools.map(({ name }) => name),
	["asking_asking_who"],
);
check(
	"headers: a call's headers reach the server's Authenticate, and the handler reads the user",
	await asking.answer(
		{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "asking_asking_who" } },
		{ headers: new Headers({ "sumi-chat": "chat-7" }) },
	),
	{ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: '"chat-7"' }] } },
);
check(
	"headers: a call with none is refused by a guard that needs a user",
	await asking
		.answer({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "asking_asking_who" } })
		.then((reply) => JSON.stringify(reply).includes('"isError":true')),
	true,
);

if (tally.failed > 0) {
	process.exitCode = 1;
}
