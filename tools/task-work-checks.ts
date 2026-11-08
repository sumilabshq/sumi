import { localTransport, runtime } from "../packages/shared/data-framework/src/index.ts";
import type { McpServer, Runtime } from "../packages/shared/data-framework/src/index.ts";
import type { WindowOffers } from "../plugins/sumi-host/src/index.ts";
import { builtInPluginState, startSumiPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";
import { tasks as tasksContract } from "../plugins/tasks/data/tasks/generated/contract.ts";
import { tasks as tasksModule } from "../plugins/tasks/data/tasks/generated/module.ts";
import { FixedClockGateway } from "../plugins/tasks/data/tasks/gateways/clock/clock.gateway.ts";
import { MemoryTasksGateway } from "../plugins/tasks/data/tasks/gateways/tasks/memory.gateway.ts";
import { check, tally } from "./check-helpers.ts";

const START = Date.UTC(2026, 10, 8, 9);
const ASKING_CHAT = "chat-7";
const TOOL_NAMES = [
	"task-work_tasks_all",
	"task-work_tasks_attach",
	"task-work_tasks_check-criterion",
	"task-work_tasks_create",
	"task-work_tasks_mark-step",
	"task-work_tasks_move",
	"task-work_tasks_one",
	"task-work_tasks_search",
	"task-work_tasks_start",
	"task-work_tasks_update",
];

const plugins = startSumiPlugins(builtInPluginState());
const core = localTransport();
core.serve(
	runtime()
		.modules(tasksModule({ injects: { tasks: new MemoryTasksGateway(), clock: new FixedClockGateway(START) } }))
		.start({ platform: "server", env: {} }),
);
const windowApp = runtime()
	.modules(
		...plugins.windowModules
			.map((windowModule) => windowModule.moduleOf({}))
			.filter(({ definition }) => definition.name === "task-work"),
	)
	.imports(tasksContract({ over: core }))
	.start({ platform: "browser", scope: { workspaceId: "task-work" } });

function offersOf(app: Runtime): WindowOffers {
	return {
		workspaceId: "task-work",
		platform: "browser",
		windowApp: app,
		core,
		windowServer: localTransport(),
		focusedChatId: () => null,
	};
}

function servedOrNull(serve: (offers: WindowOffers) => McpServer): McpServer | null {
	try {
		return serve(offersOf(windowApp));
	} catch {
		return null;
	}
}

const served = plugins.agentMcpServers.map(({ serve }) => servedOrNull(serve)).find((one) => one?.name === "tasks");

function toolCall(name: string, args: unknown, headers: Headers): Promise<unknown> {
	return (
		served?.answer(
			{
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: {
					name,
					arguments: args,
				},
			},
			{ headers },
		) ?? Promise.resolve(null)
	);
}

function textOf(reply: unknown): string {
	const text = JSON.stringify(reply);
	const found = /"text":"((?:[^"\\]|\\.)*)"/.exec(text);
	return found?.[1] === undefined ? "" : JSON.parse(`"${found[1]}"`);
}

function answeredOf(reply: unknown): unknown {
	return isToolError(reply) ? null : JSON.parse(textOf(reply) || "null");
}

function isToolError(reply: unknown): boolean {
	return JSON.stringify(reply).includes('"isError":true');
}

const askingChat = new Headers({ "sumi-chat": ASKING_CHAT });

check("the tasks plugin registers its own MCP server, tasks", served?.name, "tasks");
check(
	"the server serves every task tool, named module_feature_request",
	served?.tools.map(({ name }) => name).sort(),
	TOOL_NAMES,
);
check(
	"every tool carries a description and fits 64 characters",
	served?.tools.every(({ name, description }) => (description ?? "").length > 40 && name.length <= 64),
	true,
);
check(
	"create tells the agent to search first, by the new tool's name",
	served?.tools
		.find(({ name }) => name === "task-work_tasks_create")
		?.description?.includes("Always task-work_tasks_search first"),
	true,
);

const created = await toolCall(
	"task-work_tasks_create",
	{ title: "Ship the tasks plugin", kind: "research", plan: ["Move the tools"], acceptance: ["Every tool answers"] },
	askingChat,
);
const createdId = (answeredOf(created) as { readonly task?: { readonly id: string } } | null)?.task?.id ?? "";
const board = runtime()
	.imports(tasksContract({ over: core }))
	.start();
const kept = await board.send(tasksContract.board.one, { task: createdId });
check(
	"create attributes the task to the chat the header names",
	kept.ok ? [kept.output.createdBy, kept.output.chats] : kept.reason,
	[ASKING_CHAT, [ASKING_CHAT]],
);

const started = await toolCall("task-work_tasks_start", { task: createdId }, askingChat);
check(
	"start takes it for the asking chat",
	isToolError(started) ? textOf(started) : (answeredOf(started) as { readonly owner?: string } | null)?.owner,
	ASKING_CHAT,
);

const listed = answeredOf(await toolCall("task-work_tasks_all", { owner: ASKING_CHAT }, askingChat)) as {
	readonly items?: readonly { readonly id: string }[];
} | null;
check(
	"the list finds it under the asking chat",
	listed?.items?.map(({ id }) => id),
	[createdId],
);

const foreign = await toolCall(
	"task-work_tasks_move",
	{ task: createdId, to: "paused", note: "later" },
	new Headers({ "sumi-chat": "chat-other" }),
);
check("another chat cannot move it: the tasks module refuses, as a tool error", isToolError(foreign), true);

const anonymous = await toolCall("task-work_tasks_search", { query: "Ship" }, new Headers());
check(
	"a call with no sumi-chat header is refused, unauthenticated",
	[isToolError(anonymous), textOf(anonymous).length > 0],
	[true, true],
);

if (tally.failed > 0) {
	process.exitCode = 1;
}
