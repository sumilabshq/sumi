import { z } from "zod";
import { app, localTransport } from "../packages/shared/core/src/requests/index.ts";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { server } from "../packages/shared/core/src/requests/server/index.ts";
import {
	CreateTaskAskSchema,
	EditTaskAskSchema,
	MarkStepAskSchema,
	MoveTaskAskSchema,
	TaskQuery,
	TasksModule as TasksContract,
} from "../packages/domain/tasks/generated/contract.ts";
import type { TaskView } from "../packages/domain/tasks/generated/contract.ts";
import { TasksModule } from "../packages/domain/tasks/module.ts";
import { FixedClockGateway } from "../packages/domain/tasks/gateways/clock/clock.gateway.ts";
import { MemoryTasksGateway } from "../packages/domain/tasks/gateways/tasks/memory.gateway.ts";
import { runAgentTool } from "../apps/host-tauri/src/agent/run-agent-tool.ts";
import { ChatSessions, ONE_CHAT_LINK } from "../apps/host-tauri/src/assistant/chat-sessions.ts";
import { chatTasksOver, settleAskOf } from "../apps/host-tauri/src/assistant/chat-tasks.ts";
import type { ChatTasks } from "../apps/host-tauri/src/assistant/chat-tasks.ts";
import type { SettleTurnAsk } from "../packages/domain/tasks/generated/contract.ts";
import { failureAnswerOf } from "../apps/host-tauri/src/assistant/turn-run.ts";
import TOOLS from "../apps/host-tauri/src-tauri/src/agent/tools.json" with { type: "json" };
import type { RunAnswer, TurnRun } from "../apps/host-tauri/src/assistant/turn-run.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

const START = Date.UTC(2026, 9, 30, 9);
const TURNS_START = START - 1000;
const A = "chat-a";
const B = "chat-b";
const FOREIGN = "chat-from-the-model";
const DONE: RunAnswer = {
	failure: null,
	failureKind: null,
	resumesAt: null,
};

const WORKPLACE = {
	type: "workplace",
	folder: "/repo",
	branch: "feat/task-line",
};

const CreatedSchema = z.object({
	task: z.object({
		id: z.string(),
	}),
});

interface HeldRun {
	readonly asked: string;
	readonly finish: (answer: RunAnswer) => void;
}

function tasksApp(): StartedApp {
	const link = localTransport();
	server()
		.modules(TasksModule.with({ tasks: new MemoryTasksGateway(), clock: new FixedClockGateway(START) }))
		.listen(link)
		.start({ env: {} });
	return app().imports(TasksContract.over(link)).start();
}

async function viewOf(tasks: StartedApp, task: string): Promise<TaskView> {
	const read = await tasks.send(TaskQuery, { task });

	if (!read.ok) {
		throw new Error(read.reason);
	}

	return read.output;
}

function createdIdOf(created: unknown): string {
	return CreatedSchema.parse(created).task.id;
}

async function statusComes(
	tasks: StartedApp,
	{ task, status }: { readonly task: string; readonly status: string },
): Promise<boolean> {
	for (let tries = 0; tries < 100; tries += 1) {
		if ((await viewOf(tasks, task)).card.status === status) {
			return true;
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
	}

	return false;
}

async function thrownMessageOf(run: () => Promise<unknown>): Promise<string> {
	try {
		await run();
		return "";
	} catch (failure) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

async function startedTask(tasks: StartedApp, chatId: string, title: string): Promise<string> {
	const context = {
		app: tasks,
		chatId,
	};
	const created = await runAgentTool(context, "task_create", {
		title,
		kind: "code",
		acceptance: ["the line shows above the composer"],
		plan: ["draw the line", "test it"],
	});
	const id = createdIdOf(created);
	await runAgentTool(context, "task_attach", {
		task: id,
		item: WORKPLACE,
	});
	await runAgentTool(context, "task_start", { task: id });
	return id;
}

async function toolsTakeTheChatFromContext(): Promise<void> {
	const tasks = tasksApp();
	const context = {
		app: tasks,
		chatId: A,
	};
	const created = await runAgentTool(context, "task_create", {
		chat: FOREIGN,
		title: "Draw the task line",
		kind: "code",
		acceptance: ["the line shows above the composer"],
		plan: ["draw the line", "test it"],
	});
	const id = createdIdOf(created);
	check("task_create writes the asking chat, not the one the model sent", (await viewOf(tasks, id)).createdBy, A);
	await runAgentTool(context, "task_attach", {
		chat: FOREIGN,
		task: id,
		item: WORKPLACE,
	});
	await runAgentTool(context, "task_start", {
		chat: FOREIGN,
		task: id,
	});
	check("task_start makes the context's chat the owner", (await viewOf(tasks, id)).card.owner, A);
	const refused = await thrownMessageOf(() =>
		runAgentTool(context, "task_move", {
			task: id,
			to: "ready_to_test",
		}),
	);
	check("a refused move reaches the agent as an error", refused.includes("cannot go to ready_to_test yet"), true);
	check("the error lists what is missing", refused.includes("draw the line"), true);
	check("the refused task stays in progress", (await viewOf(tasks, id)).card.status, "in_progress");
}

interface Held {
	readonly sessions: ChatSessions;
	readonly runs: HeldRun[];
	readonly drafts: Set<string>;
}

function heldSessions(tasks: StartedApp, chatTasks: ChatTasks = chatTasksOver(tasks)): Held {
	const runs: HeldRun[] = [];
	const drafts = new Set<string>();
	const sessions = new ChatSessions(
		{
			...ONE_CHAT_LINK,
			tasks: chatTasks,
		},
		async (chatId, asked) => {
			await chatTasks.askTrailer(chatId);
			const held: { finish: (answer: RunAnswer) => void } = { finish: () => undefined };
			const done = new Promise<RunAnswer>((finish) => {
				held.finish = finish;
			});
			const run: TurnRun = {
				stop: () => held.finish(DONE),
				done,
			};
			runs.push({ asked, finish: (answer) => held.finish(answer) });
			return { run, providerId: "claude-code", resumesWithoutAnId: false };
		},
		() => TURNS_START,
	);
	sessions.lendDrafts((chatId) => drafts.has(chatId));
	return { sessions, runs, drafts };
}

async function stopGuardNudgesAndRespectsAStop(): Promise<void> {
	const tasks = tasksApp();
	const id = await startedTask(tasks, A, "Draw the task line");
	const { sessions, runs } = heldSessions(tasks);
	const session = await sessions.sessionOf(A);
	await session.send("Draw it");
	await waitFor(() => runs.length === 1);
	runs[0]?.finish(DONE);
	check("a turn ending with a task in progress gets the nudge", await waitFor(() => runs.length === 2), true);
	check("the nudge names the task", runs[1]?.asked.startsWith(`[Sumi] ${id}`), true);
	session.stop();
	await waitFor(() => !session.now().busy);
	check("a person's stop pauses the task", await statusComes(tasks, { task: id, status: "paused" }), true);
	await new Promise((resolve) => setTimeout(resolve, 50));
	check("a person's stop sends no nudge", runs.length, 2);
}

async function silenceBlocksAsSessionSilent(): Promise<void> {
	const tasks = tasksApp();
	const id = await startedTask(tasks, B, "Write the report");
	const { sessions, runs } = heldSessions(tasks);
	await (await sessions.sessionOf(B)).send("Write it");
	await waitFor(() => runs.length === 1);
	runs[0]?.finish({
		failure: "Claude Code produced nothing for 3 minutes, so it was stopped.",
		failureKind: "silent",
		resumesAt: null,
	});
	check("a silent session blocks the task", await statusComes(tasks, { task: id, status: "blocked" }), true);
	check("the blocker is session_silent", (await viewOf(tasks, id)).card.blocker?.kind, "session_silent");
	check("a failed turn sends no nudge", runs.length, 1);
}

function failureKindsMap(): void {
	const asked = settleAskOf(
		A,
		{
			turn: "t-1",
			ended: "failed",
			startedBy: "person",
			startedAt: START,
			failureKind: "silent",
			failure: "quiet",
			resumesAt: null,
		},
		{
			isDrafted: false,
			isBusy: false,
		},
	);
	check("the host hands the domain its raw failure kind", asked.failure?.kind, "silent");
	check(
		"a usage limit text is a usage_limit failure",
		failureAnswerOf("You've hit your usage limit · resets 5pm", null).failureKind,
		"usage_limit",
	);
	check(
		"a 5-hour limit text is a usage_limit failure",
		failureAnswerOf("5-hour limit reached ∙ resets 3pm", null).failureKind,
		"usage_limit",
	);
	check(
		"a transient rate limit is not a usage limit",
		failureAnswerOf("API Error: Rate limit exceeded, resets at 12:01", null).failureKind,
		"other",
	);
	check("any other failure is other", failureAnswerOf("Claude Code exited with code 1.", null).failureKind, "other");
	check(
		"the CLI's reset second becomes resumesAt",
		failureAnswerOf("Claude AI usage limit reached|1761840000", null).resumesAt,
		1_761_840_000_000,
	);
	const usage = { fiveHour: { used: 1, resetsAt: 5_000 }, week: { used: 0.4, resetsAt: 9_000 } };
	check(
		"with no second in the text the fullest window's reset is used",
		failureAnswerOf("You've hit your usage limit", usage).resumesAt,
		5_000,
	);
	check(
		"a failure that is no usage limit resumes at nothing",
		failureAnswerOf("exited with code 1", usage).resumesAt,
		null,
	);
}

interface GatedSettle {
	readonly slowSettle: ChatTasks;
	readonly gate: { open: () => void };
}

function gatedSettle(tasks: StartedApp): GatedSettle {
	const real = chatTasksOver(tasks);
	const gate: { open: () => void } = { open: () => undefined };
	const opened = new Promise<void>((open) => {
		gate.open = open;
	});
	const slowSettle: ChatTasks = {
		...real,
		settle: async (chatId, turn, facts) => {
			await opened;
			return real.settle(chatId, turn, facts);
		},
	};
	return { slowSettle, gate };
}

async function draftedTurnPausesItsTask(): Promise<void> {
	const tasks = tasksApp();
	const id = await startedTask(tasks, A, "Write while it works");
	const writing = heldSessions(tasks);
	const session = await writing.sessions.sessionOf(A);
	writing.drafts.add(A);
	await session.send("Go");
	await waitFor(() => writing.runs.length === 1);
	writing.runs[0]?.finish(DONE);
	check(
		"a turn ending while the person writes pauses its task",
		await statusComes(tasks, { task: id, status: "paused" }),
		true,
	);
	check(
		"with a reason the person reads",
		(await viewOf(tasks, id)).card.note?.includes("you were writing in its chat"),
		true,
	);
	check("and no nudge goes out", writing.runs.length, 1);
	writing.drafts.delete(A);
	await new Promise((resolve) => setTimeout(resolve, 50));
	check("clearing the draft sends nothing from the host", writing.runs.length, 1);
	await session.send("Here is what I meant");
	await waitFor(() => writing.runs.length === 2);
	check("the person's own send right after goes out as theirs", writing.runs[1]?.asked, "Here is what I meant");
}

async function draftDuringTheSettlePausesItsTask(): Promise<void> {
	const tasks = tasksApp();
	const id = await startedTask(tasks, A, "Draft in the gap");
	const { slowSettle, gate } = gatedSettle(tasks);
	const gap = heldSessions(tasks, slowSettle);
	await (await gap.sessions.sessionOf(A)).send("Go on");
	await waitFor(() => gap.runs.length === 1);
	gap.runs[0]?.finish(DONE);
	await new Promise((resolve) => setTimeout(resolve, 20));
	gap.drafts.add(A);
	gate.open();
	check(
		"a draft that appears while the turn settles pauses the task",
		await statusComes(tasks, { task: id, status: "paused" }),
		true,
	);
	check("and no nudge goes out", gap.runs.length, 1);
}

async function refusedNudgePausesItsTask(): Promise<void> {
	const tasks = tasksApp();
	const id = await startedTask(tasks, A, "Refused nudge");
	const refused = heldSessions(tasks);
	const session = await refused.sessions.sessionOf(A);
	session.sendFromHost = () => Promise.reject(new Error("the provider refused it"));
	await session.send("Go");
	await waitFor(() => refused.runs.length === 1);
	refused.runs[0]?.finish(DONE);
	check("a nudge the chat refuses pauses the task", await statusComes(tasks, { task: id, status: "paused" }), true);
	check(
		"with the refusal as its reason",
		(await viewOf(tasks, id)).card.note?.includes("the provider refused it"),
		true,
	);
}

async function clearedChatGetsNoNudge(): Promise<void> {
	const tasks = tasksApp();
	await startedTask(tasks, A, "Cleared mid settle");
	const { slowSettle, gate } = gatedSettle(tasks);
	const cleared = heldSessions(tasks, slowSettle);
	const clearedSession = await cleared.sessions.sessionOf(A);
	await clearedSession.send("Go on");
	await waitFor(() => cleared.runs.length === 1);
	cleared.runs[0]?.finish(DONE);
	await new Promise((resolve) => setTimeout(resolve, 20));
	await clearedSession.clear();
	gate.open();
	await new Promise((resolve) => setTimeout(resolve, 50));
	check("a nudge whose settle was in flight is dropped after a clear", cleared.runs.length, 1);
}

async function taskStartedInTheTurnIsGuarded(): Promise<void> {
	const tasks = tasksApp();
	const { sessions, runs } = heldSessions(tasks);
	await (await sessions.sessionOf(A)).send("Make a task for the line and do it");
	await waitFor(() => runs.length === 1);
	const id = await startedTask(tasks, A, "Started in the turn");
	runs[0]?.finish(DONE);
	check("a task started during the turn gets the nudge", await waitFor(() => runs.length === 2), true);
	check("the nudge names that task", runs[1]?.asked.startsWith(`[Sumi] ${id}`), true);
}

async function personTurnsAreNotCounted(): Promise<void> {
	const tasks = tasksApp();
	await startedTask(tasks, A, "Side questions");
	const real = chatTasksOver(tasks);
	const settled: SettleTurnAsk["startedBy"][] = [];
	const spying: ChatTasks = {
		...real,
		settle: (chatId, turn, facts) => {
			settled.push(turn.startedBy);
			return real.settle(chatId, turn, facts);
		},
	};
	const { sessions, runs } = heldSessions(tasks, spying);
	await (await sessions.sessionOf(A)).send("What is in the README?");
	await waitFor(() => runs.length === 1);
	runs[0]?.finish(DONE);
	await waitFor(() => runs.length === 2);
	runs[1]?.finish(DONE);
	await waitFor(() => settled.length === 2);
	check("the person's turn settles as the person's, the nudge's as the host's", settled, ["person", "host"]);
}

async function toolInputs(): Promise<void> {
	const tasks = tasksApp();
	const context = {
		app: tasks,
		chatId: A,
	};
	const notObject = await thrownMessageOf(() => runAgentTool(context, "task_list", "everything"));
	check("a non-object input is refused", notObject.includes("input is not an object"), true);
	const created = await runAgentTool(context, "task_create", {
		title: "Nulls are fine",
		kind: "ops",
		description: null,
		acceptance: null,
		parent: null,
	});
	check("null optional fields are taken as left out", createdIdOf(created), "T-1");
}

const LIMITS = ["minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum"];

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function limitsOf(property: unknown): string {
	if (!isRecord(property)) {
		return "";
	}

	const branches = Array.isArray(property["anyOf"]) ? property["anyOf"] : [property];
	const branch = branches.find((one) => isRecord(one) && one["type"] !== "null");

	if (!isRecord(branch)) {
		return "";
	}

	const own = LIMITS.filter((key) => key in branch).map((key) => `${key}=${String(branch[key])}`);
	return [...own, `items(${limitsOf(branch["items"])})`].join(",");
}

function toolLimitsMatchTheSchemas(): void {
	const toolSchemas = {
		task_create: CreateTaskAskSchema,
		task_update: EditTaskAskSchema,
		task_step: MarkStepAskSchema,
		task_move: MoveTaskAskSchema,
	};

	for (const [name, schema] of Object.entries(toolSchemas)) {
		const tool = TOOLS.find((listed) => listed.name === name);
		const declared = z.toJSONSchema(schema, { io: "input" }).properties ?? {};
		const listed: Record<string, unknown> = tool?.inputSchema.properties ?? {};
		const drift = Object.keys(listed).filter((key) => limitsOf(listed[key]) !== limitsOf(declared[key]));
		check(`${name} in tools.json carries the zod limits`, drift, []);
	}
}

await toolsTakeTheChatFromContext();
await stopGuardNudgesAndRespectsAStop();
await silenceBlocksAsSessionSilent();
failureKindsMap();
await draftedTurnPausesItsTask();
await draftDuringTheSettlePausesItsTask();
await refusedNudgePausesItsTask();
await clearedChatGetsNoNudge();
await taskStartedInTheTurnIsGuarded();
await personTurnsAreNotCounted();
await toolInputs();
toolLimitsMatchTheSchemas();

if (tally.failed > 0) {
	console.log(`tasks host: ${tally.failed} check(s) failed`);
	process.exit(1);
}

console.log("tasks host: all checks passed");
process.exit(0);
