import { app, localTransport } from "../packages/shared/data-framework/src/index.ts";
import type { Answer, StartedApp } from "../packages/shared/data-framework/src/index.ts";
import { server } from "../packages/shared/data-framework/src/server/index.ts";
import {
	AcceptTaskCommand,
	AttachToTaskCommand,
	BoardQuery,
	ChatTaskLineQuery,
	CheckCriterionCommand,
	ContinueTaskCommand,
	CreateTaskCommand,
	EditTaskCommand,
	KeepTaskCommand,
	MarkStepCommand,
	MoveTaskCommand,
	ReconcileTasksCommand,
	ReleaseChatTasksCommand,
	SearchTasksQuery,
	SendBackTaskCommand,
	SettleTurnCommand,
	StartTaskCommand,
	SweepStaleTasksCommand,
	TaskQuery,
	TaskTrailerQuery,
	TasksModule as TasksContract,
	TasksQuery,
	UndeliveredTaskCommand,
} from "../packages/domain/tasks/generated/contract.ts";
import { TasksModule } from "../packages/domain/tasks/module.ts";
import { FixedClockGateway } from "../packages/domain/tasks/gateways/clock/clock.gateway.ts";
import { MemoryTasksGateway } from "../packages/domain/tasks/gateways/tasks/memory.gateway.ts";
import { BoardSchema, MOST_PROGRESSED } from "../packages/domain/tasks/shared/schema/task.schema.ts";
import { undeliveredWordsOf } from "../apps/tasks/src/features/tasks/lib/use-deliver-task.ts";
import type { Task } from "../packages/domain/tasks/shared/schema/task.schema.ts";
import type { TaskView } from "../packages/domain/tasks/shared/schema/task-view.schema.ts";
import { check, tally } from "./check-helpers.ts";

const DAY = 86_400_000;
const START = Date.UTC(2026, 9, 30, 9);
const A = "chat-a";
const B = "chat-b";
const HOUR = 3_600_000;

interface Bench {
	readonly tasks: StartedApp;
	readonly memory: MemoryTasksGateway;
	readonly clock: FixedClockGateway;
}

function bench(): Bench {
	const memory = new MemoryTasksGateway();
	const clock = new FixedClockGateway(START);
	const link = localTransport();
	server()
		.modules(TasksModule.with({ tasks: memory, clock }))
		.listen(link)
		.start({ env: {} });
	return {
		tasks: app().imports(TasksContract.over(link)).start(),
		memory,
		clock,
	};
}

function outputOf<T>(answer: Answer<T>): T {
	if (!answer.ok) {
		throw new Error(`refused: ${answer.reason}`);
	}

	return answer.output;
}

function reasonOf(answer: Answer<unknown>): string {
	return answer.ok ? "" : answer.reason;
}

async function codeTask(tasks: StartedApp, title: string, chat = A): Promise<string> {
	const created = outputOf(
		await tasks.send(CreateTaskCommand, {
			chat,
			title,
			kind: "code",
			acceptance: ["the line shows above the composer"],
			plan: ["draw the line", "test it"],
		}),
	);
	return created.task.card.id;
}

async function startedCodeTask(tasks: StartedApp, title: string, chat = A): Promise<string> {
	const id = await codeTask(tasks, title, chat);
	outputOf(
		await tasks.send(AttachToTaskCommand, {
			chat,
			task: id,
			item: { type: "workplace", folder: "/repo", branch: "feat/x" },
		}),
	);
	outputOf(await tasks.send(StartTaskCommand, { chat, task: id }));
	return id;
}

async function readyForTest(tasks: StartedApp, id: string): Promise<void> {
	outputOf(await tasks.send(MarkStepCommand, { chat: A, task: id, step: "S1", state: "done" }));
	outputOf(await tasks.send(MarkStepCommand, { chat: A, task: id, step: "S2", state: "done" }));
	outputOf(
		await tasks.send(CheckCriterionCommand, {
			chat: A,
			task: id,
			criterion: "C1",
			state: "met",
			evidence: "run 1, case K1",
		}),
	);
	outputOf(
		await tasks.send(AttachToTaskCommand, {
			chat: A,
			task: id,
			item: { type: "test_plan", stand: "dev build on :5174", cases: [{ text: "open a chat" }] },
		}),
	);
	outputOf(
		await tasks.send(AttachToTaskCommand, { chat: A, task: id, item: { type: "test_run", results: { K1: "passed" } } }),
	);
}

async function creating(): Promise<void> {
	const { tasks } = bench();
	const first = outputOf(
		await tasks.send(CreateTaskCommand, {
			chat: A,
			title: "Draw the task line",
			kind: "code",
			acceptance: ["shows"],
			plan: ["draw"],
		}),
	);
	check(
		"a task is minted T-1 in To do",
		[first.task.card.id, first.task.card.status, first.isExisting],
		["T-1", "todo", false],
	);
	check("its criteria and steps get ids", [first.task.acceptance[0]?.id, first.task.plan[0]?.id], ["C1", "S1"]);
	const again = outputOf(await tasks.send(CreateTaskCommand, { chat: B, title: "draw the task-line!", kind: "code" }));
	check(
		"an open task with the same title is answered, not duplicated",
		[again.task.card.id, again.isExisting],
		["T-1", true],
	);
	const page = outputOf(await tasks.send(TasksQuery, {}));
	check("only one task stands", page.total, 1);
	const parallel = await Promise.all(
		[1, 2, 3].map((n) => tasks.send(CreateTaskCommand, { chat: A, title: `Parallel ${n}`, kind: "ops" })),
	);
	check("three creates at once get three numbers", parallel.map((answer) => outputOf(answer).task.card.id).sort(), [
		"T-2",
		"T-3",
		"T-4",
	]);
}

async function starting(): Promise<void> {
	const { tasks } = bench();
	const id = await codeTask(tasks, "Board v4");
	const refused = reasonOf(await tasks.send(StartTaskCommand, { chat: A, task: id }));
	check("a code task with no workplace does not start", refused.includes("attach the folder and branch"), true);
	outputOf(
		await tasks.send(AttachToTaskCommand, {
			chat: A,
			task: id,
			item: { type: "workplace", folder: "/repo", branch: "feat/tasks" },
		}),
	);
	const started = outputOf(await tasks.send(StartTaskCommand, { chat: A, task: id }));
	check(
		"it starts once it has one, owned by the chat",
		[started.card.status, started.card.owner, started.card.branch],
		["in_progress", A, "feat/tasks"],
	);
	const other = await startedCodeTask(tasks, "Second", B);
	check("another chat may start its own", other, "T-2");
	const second = await codeTask(tasks, "Third");
	outputOf(
		await tasks.send(AttachToTaskCommand, {
			chat: A,
			task: second,
			item: { type: "workplace", folder: "/repo", branch: null },
		}),
	);
	const busy = reasonOf(await tasks.send(StartTaskCommand, { chat: A, task: second }));
	check("one chat works on one task at a time", busy.includes("already works on T-1"), true);
	const foreign = reasonOf(await tasks.send(MarkStepCommand, { chat: B, task: id, step: "S1", state: "done" }));
	check("another chat cannot change a task it does not own", foreign.includes("worked by another chat"), true);
	const noNote = reasonOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "paused" }));
	check("pausing needs a note", noNote.includes("needs a note"), true);
}

async function finishing(): Promise<void> {
	const { tasks } = bench();
	const id = await startedCodeTask(tasks, "Tab drag");
	const early = reasonOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "ready_to_test" }));
	check(
		"ready to test lists every open step and criterion",
		["S1", "S2", "C1", "test plan"].every((word) => early.includes(word)),
		true,
	);
	const bare = reasonOf(await tasks.send(CheckCriterionCommand, { chat: A, task: id, criterion: "C1", state: "met" }));
	check("a criterion is not met without evidence", bare.includes("needs evidence"), true);
	await readyForTest(tasks, id);
	const ready = outputOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "ready_to_test" }));
	check(
		"with steps, criteria and a passing run it is ready to test",
		[ready.card.status, ready.card.isYourTurn, ready.card.actions],
		["ready_to_test", true, ["accept", "send_back"]],
	);
	const selfDone = reasonOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "done" }));
	check(
		"an agent marks a code task done only with the person's words",
		[selfDone.includes("the person's call"), selfDone.includes("quote their words")],
		[true, true],
	);
	const sent = outputOf(
		await tasks.send(SendBackTaskCommand, { task: id, note: "the line overlaps the composer", chat: A }),
	);
	check("send back answers the owner chat and what to say", [sent.chat, sent.message.includes("overlaps")], [A, true]);
	const reopened = outputOf(await tasks.send(TaskQuery, { task: id }));
	check(
		"send back reopens it with the person's words as a criterion",
		[reopened.card.status, reopened.acceptance.at(-1)?.text],
		["in_progress", "the line overlaps the composer"],
	);
	outputOf(
		await tasks.send(CheckCriterionCommand, {
			chat: A,
			task: id,
			criterion: "C2",
			state: "met",
			evidence: "screenshot /tmp/x.png",
		}),
	);
	outputOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "ready_to_test" }));
	const accepted = outputOf(await tasks.send(AcceptTaskCommand, { task: id }));
	check("the person accepts it", [accepted.status, accepted.closedAt !== null], ["done", true]);
	const research = outputOf(
		await tasks.send(CreateTaskCommand, {
			chat: A,
			title: "How Linear does it",
			kind: "research",
			acceptance: ["a written answer"],
			plan: ["read"],
		}),
	);
	outputOf(await tasks.send(StartTaskCommand, { chat: A, task: research.task.card.id }));
	outputOf(await tasks.send(MarkStepCommand, { chat: A, task: research.task.card.id, step: "S1", state: "done" }));
	outputOf(
		await tasks.send(CheckCriterionCommand, {
			chat: A,
			task: research.task.card.id,
			criterion: "C1",
			state: "met",
			evidence: "docs/linear.md",
		}),
	);
	const done = outputOf(await tasks.send(MoveTaskCommand, { chat: A, task: research.task.card.id, to: "done" }));
	check("an agent closes a research task itself", done.card.status, "done");
}

async function stopGuard(): Promise<void> {
	const { tasks } = bench();
	const id = await startedCodeTask(tasks, "Stop guard");
	const first = outputOf(
		await tasks.send(SettleTurnCommand, { chat: A, turn: "1", ended: "done", turnStartedAt: START, startedBy: "host" }),
	);
	check(
		"a turn ending with a task in progress is answered with a nudge",
		first.followUp?.message.includes(`${id} "Stop guard" is still in progress`),
		true,
	);
	const repeated = outputOf(
		await tasks.send(SettleTurnCommand, { chat: A, turn: "1", ended: "done", turnStartedAt: START, startedBy: "host" }),
	);
	check(
		"the same turn settled twice nudges once",
		[
			repeated.followUp?.message === first.followUp?.message,
			outputOf(await tasks.send(TaskQuery, { task: id })).card.status,
		],
		[true, "in_progress"],
	);
	outputOf(
		await tasks.send(SettleTurnCommand, { chat: A, turn: "2", ended: "done", turnStartedAt: START, startedBy: "host" }),
	);
	const third = outputOf(
		await tasks.send(SettleTurnCommand, { chat: A, turn: "3", ended: "done", turnStartedAt: START, startedBy: "host" }),
	);
	const stalled = outputOf(await tasks.send(TaskQuery, { task: id }));
	check(
		"after two nudges the task is blocked as stalled, and the turn may end",
		[third.followUp, stalled.card.status, stalled.card.blocker?.kind, stalled.card.actions[0]],
		[null, "blocked", "stalled", "continue"],
	);
	const otherChat = outputOf(
		await tasks.send(SettleTurnCommand, { chat: B, turn: "1", ended: "done", turnStartedAt: START, startedBy: "host" }),
	);
	check("a chat with no task in progress ends its turn freely", otherChat.followUp, null);
	const nudged = await startedCodeTask(tasks, "Step resets", B);
	outputOf(
		await tasks.send(SettleTurnCommand, { chat: B, turn: "2", ended: "done", turnStartedAt: START, startedBy: "host" }),
	);
	outputOf(await tasks.send(MarkStepCommand, { chat: B, task: nudged, step: "S1", state: "done" }));
	outputOf(
		await tasks.send(SettleTurnCommand, { chat: B, turn: "3", ended: "done", turnStartedAt: START, startedBy: "host" }),
	);
	const fresh = outputOf(
		await tasks.send(SettleTurnCommand, { chat: B, turn: "4", ended: "done", turnStartedAt: START, startedBy: "host" }),
	);
	check(
		"marking a step resets the nudges",
		[fresh.followUp !== null, outputOf(await tasks.send(TaskQuery, { task: nudged })).card.status],
		[true, "in_progress"],
	);
	const compact = outputOf(
		await tasks.send(SettleTurnCommand, {
			chat: B,
			turn: "5",
			ended: "compact",
			turnStartedAt: START,
			startedBy: "host",
		}),
	);
	check(
		"a compact turn with a task in progress is nudged without counting",
		[compact.followUp?.task, outputOf(await tasks.send(TaskQuery, { task: nudged })).card.status],
		[nudged, "in_progress"],
	);
}

async function watchdog(): Promise<void> {
	const { tasks } = bench();
	const stopped = await startedCodeTask(tasks, "Stopped by you");
	outputOf(
		await tasks.send(SettleTurnCommand, {
			chat: A,
			turn: "1",
			ended: "stopped",
			turnStartedAt: START,
			startedBy: "host",
		}),
	);
	const paused = outputOf(await tasks.send(TaskQuery, { task: stopped }));
	check(
		"the person's stop pauses the task",
		[paused.card.status, paused.card.note, paused.card.actions],
		["paused", "stopped by you", ["continue"]],
	);
	const continued = outputOf(await tasks.send(ContinueTaskCommand, { task: stopped, chat: A }));
	check(
		"continue resumes it in its own chat",
		[continued.chat, continued.message.startsWith("Continue T-1")],
		[A, true],
	);
	outputOf(
		await tasks.send(SettleTurnCommand, {
			chat: A,
			turn: "2",
			ended: "failed",
			turnStartedAt: START,
			startedBy: "host",
			failure: { kind: "silent", detail: "Claude Code produced nothing for 3 minutes" },
		}),
	);
	const silent = outputOf(await tasks.send(TaskQuery, { task: stopped }));
	check(
		"silence blocks it with the reason",
		[silent.card.status, silent.card.blocker?.kind, silent.card.note],
		["blocked", "session_silent", "Claude Code produced nothing for 3 minutes"],
	);
	outputOf(await tasks.send(ContinueTaskCommand, { task: stopped, chat: A }));
	outputOf(await tasks.send(ReconcileTasksCommand, { liveChats: [] }));
	const interrupted = outputOf(await tasks.send(TaskQuery, { task: stopped }));
	check(
		"an app start blocks a task left in progress",
		[interrupted.card.status, interrupted.card.blocker?.kind],
		["blocked", "interrupted"],
	);
	outputOf(await tasks.send(ContinueTaskCommand, { task: stopped, chat: A }));
	outputOf(await tasks.send(ReleaseChatTasksCommand, { chat: A, why: "cleared" }));
	const released = outputOf(await tasks.send(TaskQuery, { task: stopped }));
	check(
		"clearing its chat blocks it and frees the owner",
		[released.card.status, released.card.owner],
		["blocked", null],
	);
	const takeOver = outputOf(await tasks.send(ContinueTaskCommand, { task: stopped, chat: null }));
	const todo = outputOf(await tasks.send(TaskQuery, { task: stopped }));
	check(
		"continuing a task with no chat puts it back in To do for any chat",
		[takeOver.chat, todo.card.status, takeOver.message.includes("task_start")],
		[null, "todo", true],
	);
}

async function blockers(): Promise<void> {
	const { tasks } = bench();
	const first = await startedCodeTask(tasks, "Dictation pill");
	const second = await codeTask(tasks, "Voice commands", B);
	outputOf(await tasks.send(EditTaskCommand, { chat: B, task: second, blockedBy: [first] }));
	outputOf(
		await tasks.send(AttachToTaskCommand, {
			chat: B,
			task: second,
			item: { type: "workplace", folder: "/repo", branch: null },
		}),
	);
	const waits = reasonOf(await tasks.send(StartTaskCommand, { chat: B, task: second }));
	check("a task waiting for another cannot start", waits.includes(`${first} must close first`), true);
	const self = reasonOf(await tasks.send(EditTaskCommand, { chat: B, task: second, blockedBy: [second] }));
	check("a task cannot wait for itself", self.includes("cannot wait for itself"), true);
	const card = outputOf(await tasks.send(TaskQuery, { task: second })).card;
	check("its card names what it waits for", card.waitsFor, [first]);
	outputOf(await tasks.send(EditTaskCommand, { chat: A, task: first, addSteps: [] }));
	outputOf(
		await tasks.send(MoveTaskCommand, { chat: A, task: first, to: "cancelled", note: "the person dropped dictation" }),
	);
	const freed = outputOf(await tasks.send(StartTaskCommand, { chat: B, task: second }));
	check("once it closes the waiting task starts", freed.card.status, "in_progress");
}

async function staleness(): Promise<void> {
	const { tasks, clock } = bench();
	const id = await startedCodeTask(tasks, "Old pause");
	outputOf(
		await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "paused", note: "the person asked for tab drag first" }),
	);
	clock.moveTo(START + 15 * DAY);
	const stale = outputOf(await tasks.send(TaskQuery, { task: id })).card;
	check(
		"a pause quiet for two weeks is stale and can be kept",
		[stale.isStale, stale.actions],
		[true, ["continue", "keep"]],
	);
	outputOf(await tasks.send(KeepTaskCommand, { task: id }));
	clock.moveTo(START + 29 * DAY);
	check("keeping it moves the clock", outputOf(await tasks.send(SweepStaleTasksCommand)).changed, 0);
	clock.moveTo(START + 44 * DAY);
	check(
		"four quiet weeks after that, the sweep cancels it",
		outputOf(await tasks.send(SweepStaleTasksCommand)).changed,
		1,
	);
	check(
		"with the reason in its note",
		outputOf(await tasks.send(TaskQuery, { task: id })).card.note,
		"stale: no activity for 29 days",
	);
}

async function unansweredTestCloses(): Promise<void> {
	const { tasks, clock } = bench();
	const id = await startedCodeTask(tasks, "Never tested");
	await readyForTest(tasks, id);
	outputOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "ready_to_test" }));
	clock.moveTo(START + 2 * DAY);
	const fresh = outputOf(await tasks.send(TaskQuery, { task: id })).card;
	check(
		"ready to test quiet for 2 days is fresh",
		[fresh.isStale, fresh.quietDays, fresh.actions],
		[false, null, ["accept", "send_back"]],
	);
	clock.moveTo(START + 3 * DAY);
	const stale = outputOf(await tasks.send(TaskQuery, { task: id })).card;
	check(
		"at 3 days it is stale, waiting 3 days, and can be kept",
		[stale.isStale, stale.quietDays, stale.actions],
		[true, 3, ["accept", "send_back", "keep"]],
	);
	outputOf(await tasks.send(KeepTaskCommand, { task: id }));
	clock.moveTo(START + 16 * DAY);
	check(
		"Keep moves its clock: 13 days after it nothing closes",
		outputOf(await tasks.send(SweepStaleTasksCommand)).changed,
		0,
	);
	clock.moveTo(START + 17 * DAY);
	check("14 quiet days after Keep, the sweep closes it", outputOf(await tasks.send(SweepStaleTasksCommand)).changed, 1);
	const closed = outputOf(await tasks.send(TaskQuery, { task: id }));
	check(
		"as done, not cancelled, by the host, with the reason the person reads",
		[closed.card.status, closed.log.at(-1)?.by.kind, closed.card.note],
		["done", "host", "Done · not confirmed: no answer for 14 days"],
	);
	const paused = await startedCodeTask(tasks, "Old pause beside it");
	outputOf(
		await tasks.send(MoveTaskCommand, {
			chat: A,
			task: paused,
			to: "paused",
			note: "the person asked for something else",
		}),
	);
	clock.moveTo(START + 46 * DAY);
	outputOf(await tasks.send(SweepStaleTasksCommand));
	check(
		"a paused task still cancels",
		outputOf(await tasks.send(TaskQuery, { task: paused })).card.status,
		"cancelled",
	);
}

async function reading(): Promise<void> {
	const { tasks, clock } = bench();
	const old = await startedCodeTask(tasks, "Old work");
	clock.moveTo(START + 10 * DAY);
	const fresh = await codeTask(tasks, "Fresh work", B);
	const week = outputOf(await tasks.send(TasksQuery, {}));
	check(
		"the list reads the last week by default",
		week.items.map((card) => card.id),
		[fresh],
	);
	const own = outputOf(await tasks.send(TasksQuery, { asking: A }));
	check("but a chat always gets its own open tasks", own.items.map((card) => card.id).sort(), [old, fresh].sort());
	const found = outputOf(await tasks.send(SearchTasksQuery, { query: "old work" }));
	check(
		"search finds an open task whatever its age",
		found.map((card) => card.id),
		[old],
	);
	const line = outputOf(await tasks.send(ChatTaskLineQuery, { chat: A }));
	check(
		"the chat line shows the chat's task and its next step without the step id",
		[line.card?.id, line.card?.nextStep],
		[old, "draw the line"],
	);
	const trailer = outputOf(await tasks.send(TaskTrailerQuery, { chat: A }));
	check("the turn trailer names the task", trailer.trailer?.includes(`This chat's task: ${old}`), true);
	check(
		"the trailer keeps the step id for the agent",
		trailer.trailer?.includes("Next step: S1: draw the line."),
		true,
	);
	await readyForTest(tasks, old);
	outputOf(await tasks.send(MoveTaskCommand, { chat: A, task: old, to: "ready_to_test" }));
	outputOf(await tasks.send(AcceptTaskCommand, { task: old }));
	clock.moveTo(START + 12 * DAY);
	const board = outputOf(await tasks.send(BoardQuery, {}));
	const done = board.columns.find((column) => column.status === "done");
	check("Done holds the last day only", [done?.cards.length, done?.total, done?.hidden], [0, 1, 1]);
	check("a column carries its label and whether it is closed", [done?.label, done?.isClosed], ["Done", true]);
	const all = outputOf(await tasks.send(BoardQuery, { closedWithin: "all" }));
	check("All shows it", all.columns.find((column) => column.status === "done")?.cards.length, 1);
}

function linesOf(count: number, what: string): string[] {
	return Array.from({ length: count }, (_, at) => `${what} ${at + 1}`);
}

async function rewriteTasks(memory: MemoryTasksGateway, change: (task: Task) => Task): Promise<void> {
	const held = await memory.board();
	await memory.saveBoard({ ...held.board, tasks: held.board.tasks.map(change) }, { baseRev: held.rev, reason: "test" });
}

async function caps(): Promise<void> {
	const { tasks, memory } = bench();
	const id = await startedCodeTask(tasks, "Many parts");
	outputOf(await tasks.send(EditTaskCommand, { chat: A, task: id, addCriteria: linesOf(49, "criterion") }));
	const overCriteria = reasonOf(await tasks.send(EditTaskCommand, { chat: A, task: id, addCriteria: ["one more"] }));
	check("a 51st criterion is refused", overCriteria.includes("at most 50"), true);
	outputOf(await tasks.send(EditTaskCommand, { chat: A, task: id, addSteps: linesOf(98, "step") }));
	const overSteps = reasonOf(await tasks.send(EditTaskCommand, { chat: A, task: id, addSteps: ["one more"] }));
	check("a 101st step is refused", overSteps.includes("at most 100"), true);
	const overMarked = reasonOf(
		await tasks.send(MarkStepCommand, { chat: A, task: id, step: "a step not in the plan", state: "done" }),
	);
	check("marking a new step past the cap is refused", overMarked.includes("at most 100"), true);
	const overBlockers = reasonOf(await tasks.send(EditTaskCommand, { chat: A, task: id, blockedBy: linesOf(21, "T-") }));
	check("a 21st blocker is refused", overBlockers === "", false);
	const shared = await codeTask(tasks, "Shared by many", B);

	for (let n = 0; n < 55; n += 1) {
		outputOf(await tasks.send(EditTaskCommand, { chat: `chat-${n}`, task: shared, description: `by ${n}` }));
	}

	check(
		"a task edited from 55 chats keeps the last 50",
		outputOf(await tasks.send(TaskQuery, { task: shared })).chats.length,
		50,
	);
	check("the board still parses", BoardSchema.safeParse((await memory.board()).board).success, true);
}

async function sendBackAtTheCap(): Promise<void> {
	const { tasks, memory } = bench();
	const id = await startedCodeTask(tasks, "Full of criteria");
	outputOf(await tasks.send(EditTaskCommand, { chat: A, task: id, addCriteria: linesOf(49, "criterion") }));
	await readyForTest(tasks, id);

	for (let n = 2; n <= 50; n += 1) {
		outputOf(
			await tasks.send(CheckCriterionCommand, {
				chat: A,
				task: id,
				criterion: `C${n}`,
				state: "met",
				evidence: "run 1",
			}),
		);
	}

	outputOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "ready_to_test" }));
	const refused = reasonOf(await tasks.send(SendBackTaskCommand, { task: id, note: "one more thing", chat: A }));
	check(
		"sending back a task with 50 criteria is refused in the person's words",
		[refused.includes("already holds 50"), refused.includes("Accept it, or cancel it")],
		[true, true],
	);
	check("and it stays ready to test", outputOf(await tasks.send(TaskQuery, { task: id })).card.status, "ready_to_test");
	check("the board still parses after the refusal", BoardSchema.safeParse((await memory.board()).board).success, true);
}

async function nudgeResets(): Promise<void> {
	const { tasks } = bench();
	const id = await startedCodeTask(tasks, "Busy work");
	const settle = async (turn: string) =>
		outputOf(
			await tasks.send(SettleTurnCommand, { chat: A, turn, ended: "done", turnStartedAt: START, startedBy: "host" }),
		);
	await settle("1");
	outputOf(await tasks.send(MarkStepCommand, { chat: A, task: id, step: "S1", state: "active" }));
	outputOf(await tasks.send(EditTaskCommand, { chat: A, task: id, addSteps: ["another"] }));
	outputOf(
		await tasks.send(AttachToTaskCommand, {
			chat: A,
			task: id,
			item: { type: "document", kind: "notes", title: "notes" },
		}),
	);
	await settle("2");
	const third = await settle("3");
	check(
		"re-marking a step active, adding a step and attaching reset nothing",
		[third.followUp, outputOf(await tasks.send(TaskQuery, { task: id })).card.status],
		[null, "blocked"],
	);
	const other = bench();
	const checked = await startedCodeTask(other.tasks, "Checked work");
	await other.tasks.send(SettleTurnCommand, {
		chat: A,
		turn: "1",
		ended: "done",
		turnStartedAt: START,
		startedBy: "host",
	});
	await other.tasks.send(SettleTurnCommand, {
		chat: A,
		turn: "2",
		ended: "done",
		turnStartedAt: START,
		startedBy: "host",
	});
	outputOf(
		await other.tasks.send(CheckCriterionCommand, {
			chat: A,
			task: checked,
			criterion: "C1",
			state: "met",
			evidence: "run 1",
		}),
	);
	const after = outputOf(
		await other.tasks.send(SettleTurnCommand, {
			chat: A,
			turn: "3",
			ended: "done",
			turnStartedAt: START,
			startedBy: "host",
		}),
	);
	check("a criterion leaving open resets the nudges", after.followUp !== null, true);
	const side = bench();
	await startedCodeTask(side.tasks, "Side questions");
	const asked = [];

	for (const turn of ["1", "2", "3", "4"]) {
		asked.push(
			outputOf(
				await side.tasks.send(SettleTurnCommand, {
					chat: A,
					turn,
					ended: "done",
					turnStartedAt: START,
					startedBy: "person",
				}),
			).followUp !== null,
		);
	}

	const sideTask = outputOf(await side.tasks.send(TaskQuery, { task: "T-1" })).card;
	check(
		"the person's own turns are nudged but never counted toward a stall",
		[asked, sideTask.status],
		[[true, true, true, true], "in_progress"],
	);
	const fake = bench();
	const faked = await startedCodeTask(fake.tasks, "Fake progress");
	const fakeSettle = async (turn: string) =>
		outputOf(
			await fake.tasks.send(SettleTurnCommand, {
				chat: A,
				turn,
				ended: "done",
				turnStartedAt: START,
				startedBy: "host",
			}),
		);
	outputOf(await fake.tasks.send(MarkStepCommand, { chat: A, task: faked, step: "S1", state: "done" }));

	for (const turn of ["1", "2", "3"]) {
		await fakeSettle(turn);
		outputOf(await fake.tasks.send(MarkStepCommand, { chat: A, task: faked, step: "S1", state: "pending" }));
		outputOf(await fake.tasks.send(MarkStepCommand, { chat: A, task: faked, step: "S1", state: "done" }));
		outputOf(
			await fake.tasks.send(MarkStepCommand, {
				chat: A,
				task: faked,
				step: `extra ${turn}`,
				state: "skipped",
				note: "not needed",
			}),
		);
	}

	check(
		"done → pending → done and a new skipped step reset nothing",
		outputOf(await fake.tasks.send(TaskQuery, { task: faked })).card.status,
		"blocked",
	);
	const reopened = bench();
	const met = await startedCodeTask(reopened.tasks, "Met twice");
	const metSettle = async (turn: string) =>
		outputOf(
			await reopened.tasks.send(SettleTurnCommand, {
				chat: A,
				turn,
				ended: "done",
				turnStartedAt: START,
				startedBy: "host",
			}),
		);
	outputOf(
		await reopened.tasks.send(CheckCriterionCommand, {
			chat: A,
			task: met,
			criterion: "C1",
			state: "met",
			evidence: "run 1",
		}),
	);

	for (const turn of ["1", "2", "3"]) {
		await metSettle(turn);
		outputOf(await reopened.tasks.send(CheckCriterionCommand, { chat: A, task: met, criterion: "C1", state: "open" }));
		outputOf(
			await reopened.tasks.send(CheckCriterionCommand, {
				chat: A,
				task: met,
				criterion: "C1",
				state: "met",
				evidence: "run 2",
			}),
		);
	}

	check(
		"met → open → met resets nothing",
		outputOf(await reopened.tasks.send(TaskQuery, { task: met })).card.status,
		"blocked",
	);
}

async function startedMidTurn(): Promise<void> {
	const { tasks } = bench();
	const turnStartedAt = START - HOUR;
	const id = await startedCodeTask(tasks, "Started in the turn");
	const settled = outputOf(
		await tasks.send(SettleTurnCommand, { chat: A, turn: "1", ended: "done", turnStartedAt, startedBy: "person" }),
	);
	check(
		"a task the agent started during the turn gets the nudge",
		settled.followUp?.message.includes(`${id} "Started in the turn"`),
		true,
	);
	const continued = bench();
	const handed = await startedCodeTask(continued.tasks, "Moved by the person in the turn");
	outputOf(
		await continued.tasks.send(SettleTurnCommand, {
			chat: A,
			turn: "1",
			ended: "stopped",
			turnStartedAt: START,
			startedBy: "host",
		}),
	);
	continued.clock.moveTo(START + HOUR);
	outputOf(await continued.tasks.send(ContinueTaskCommand, { task: handed, chat: A }));
	const mid = outputOf(
		await continued.tasks.send(SettleTurnCommand, {
			chat: A,
			turn: "2",
			ended: "done",
			turnStartedAt: START,
			startedBy: "person",
		}),
	);
	check("a task the person moved in while the turn ran is not this turn's", mid.followUp, null);
	const tie = outputOf(
		await continued.tasks.send(SettleTurnCommand, {
			chat: A,
			turn: "3",
			ended: "done",
			turnStartedAt: START + HOUR,
			startedBy: "person",
		}),
	);
	check("a task moved in at the turn's own millisecond counts as worked", tie.followUp?.task, handed);
	const skewed = outputOf(
		await continued.tasks.send(SettleTurnCommand, {
			chat: A,
			turn: "4",
			ended: "done",
			turnStartedAt: START + HOUR - 1999,
			startedBy: "person",
		}),
	);
	check("and so does one up to two seconds of clock skew later", skewed.followUp?.task, handed);
}

async function draftedTurnPauses(): Promise<void> {
	const { tasks } = bench();
	const id = await startedCodeTask(tasks, "Paused while writing");
	const ask = { chat: A, ended: "done", turnStartedAt: START, startedBy: "host" } as const;
	const busy = outputOf(await tasks.send(SettleTurnCommand, { ...ask, turn: "1", isBusy: true }));
	check(
		"a turn ending while the chat answers again is left to that turn",
		[busy.followUp, outputOf(await tasks.send(TaskQuery, { task: id })).card.status],
		[null, "in_progress"],
	);
	const drafted = outputOf(await tasks.send(SettleTurnCommand, { ...ask, turn: "2", isDrafted: true }));
	const paused = outputOf(await tasks.send(TaskQuery, { task: id })).card;
	check(
		"a turn ending while the person writes pauses its task with the reason",
		[drafted.followUp, paused.status, paused.note?.includes("you were writing in its chat")],
		[null, "paused", true],
	);
	const resumed = outputOf(await tasks.send(StartTaskCommand, { chat: A, task: id }));
	check("the agent may take its paused task up again", resumed.card.status, "in_progress");
}

async function progressStaysCapped(): Promise<void> {
	const { tasks, memory } = bench();
	const id = await startedCodeTask(tasks, "Long progress");
	await rewriteTasks(memory, (task) => ({ ...task, progressed: linesOf(MOST_PROGRESSED, "old") }));
	outputOf(await tasks.send(MarkStepCommand, { chat: A, task: id, step: "S1", state: "done" }));
	const progressed = (await memory.board()).board.tasks[0]?.progressed ?? [];
	check(
		"a full progress list stays at its cap and keeps the newest",
		[progressed.length, progressed.at(-1)],
		[MOST_PROGRESSED, "S1"],
	);
}

function undeliveredToasts(): void {
	const refused = undeliveredWordsOf({
		task: "T-1",
		reason: "no window",
		left: { ok: false, reason: "the tasks file is read-only" },
	});
	check(
		"a refused undelivered command never says paused",
		[refused.includes("paused"), refused.includes("left as it was"), refused.includes("the tasks file is read-only")],
		[false, true, true],
	);
}

async function agentCarriesOutThePersonsWord(): Promise<void> {
	const { tasks } = bench();
	const id = await startedCodeTask(tasks, "Handed in");
	await readyForTest(tasks, id);
	outputOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "ready_to_test" }));
	const unsaid = reasonOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "todo" }));
	check(
		"an agent sends a handed-in task back to To do only with the person's words",
		[unsaid.includes("the person's call"), outputOf(await tasks.send(TaskQuery, { task: id })).card.status],
		[true, "ready_to_test"],
	);
	const dropped = outputOf(
		await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "todo", note: "put it back, I will test it next week" }),
	);
	check("with them it goes back to To do", dropped.card.status, "todo");
	const accepted = await approvedByWord(tasks);
	check(
		"an agent accepts a code task on the person's word",
		[accepted.card.status, accepted.card.closedAt !== null],
		["done", true],
	);
	check("the log holds the agent's chat and the person's words", lastLogOf(accepted), {
		by: { kind: "agent", chat: A },
		reason: "approved, ship it",
		to: "done",
	});
	const bare = reasonOf(await tasks.send(MoveTaskCommand, { chat: A, task: accepted.card.id, to: "in_progress" }));
	check("an agent reopens a done task only with the person's words", bare.includes("the person's call"), true);
	const reopened = outputOf(
		await tasks.send(MoveTaskCommand, {
			chat: A,
			task: accepted.card.id,
			to: "in_progress",
			note: "reopen it, the line is back",
		}),
	);
	check(
		"with them it reopens, logged as the agent's",
		[reopened.card.status, lastLogOf(reopened)],
		["in_progress", { by: { kind: "agent", chat: A }, reason: "reopen it, the line is back", to: "in_progress" }],
	);
	outputOf(
		await tasks.send(MoveTaskCommand, {
			chat: A,
			task: reopened.card.id,
			to: "cancelled",
			note: "the person dropped it",
		}),
	);
	const restored = outputOf(
		await tasks.send(MoveTaskCommand, { chat: A, task: reopened.card.id, to: "todo", note: "bring it back" }),
	);
	check("an agent restores a cancelled task on the person's word", restored.card.status, "todo");
}

async function approvedByWord(tasks: StartedApp): Promise<TaskView> {
	const id = await startedCodeTask(tasks, "Approved in chat");
	await readyForTest(tasks, id);
	outputOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "ready_to_test" }));
	return outputOf(await tasks.send(MoveTaskCommand, { chat: A, task: id, to: "done", note: "approved, ship it" }));
}

function lastLogOf(view: TaskView): Pick<TaskView["log"][number], "by" | "reason" | "to"> | null {
	const last = view.log.at(-1);
	return last === undefined ? null : { by: last.by, reason: last.reason, to: last.to };
}

async function onlyNudgedTasksFollowUp(): Promise<void> {
	const { tasks, memory } = bench();
	await startedCodeTask(tasks, "Stalls");
	await codeTask(tasks, "Was nudged before");
	await rewriteTasks(memory, (task) => ({
		...task,
		status: "in_progress",
		owner: A,
		nudges: task.number === 1 ? 2 : 1,
	}));
	const settled = outputOf(
		await tasks.send(SettleTurnCommand, { chat: A, turn: "1", ended: "done", turnStartedAt: START, startedBy: "host" }),
	);
	const [stalled, nudged] = [
		outputOf(await tasks.send(TaskQuery, { task: "T-1" })).card,
		outputOf(await tasks.send(TaskQuery, { task: "T-2" })).card,
	];
	check(
		"of two tasks in progress the stalled one blocks and the other is nudged in the same step",
		[stalled.status, nudged.status, settled.followUp?.message.includes("T-2")],
		["blocked", "in_progress", true],
	);
	const again = outputOf(
		await tasks.send(SettleTurnCommand, { chat: A, turn: "2", ended: "done", turnStartedAt: START, startedBy: "host" }),
	);
	check(
		"and its count went up: the next turn stalls it",
		[again.followUp, outputOf(await tasks.send(TaskQuery, { task: "T-2" })).card.status],
		[null, "blocked"],
	);
}

async function continuing(): Promise<void> {
	const { tasks } = bench();
	const id = await startedCodeTask(tasks, "Continue me");
	outputOf(
		await tasks.send(SettleTurnCommand, {
			chat: A,
			turn: "1",
			ended: "stopped",
			turnStartedAt: START,
			startedBy: "host",
		}),
	);
	const toOther = outputOf(await tasks.send(ContinueTaskCommand, { task: id, chat: B }));
	const taken = outputOf(await tasks.send(TaskQuery, { task: id })).card;
	check(
		"continue in a named chat makes it the owner",
		[toOther.chat, taken.status, taken.owner],
		[B, "in_progress", B],
	);
	const paused = outputOf(await tasks.send(UndeliveredTaskCommand, { task: id, reason: "the chat is busy" }));
	check(
		"an undelivered message pauses the task with the reason",
		[paused.status, paused.note?.includes("the chat is busy")],
		["paused", true],
	);
	const gone = outputOf(await tasks.send(ContinueTaskCommand, { task: id, chat: null }));
	const todo = outputOf(await tasks.send(TaskQuery, { task: id })).card;
	check(
		"continue with no live chat puts it in To do with no owner",
		[gone.chat, todo.status, todo.owner],
		[null, "todo", null],
	);
	const untouched = outputOf(await tasks.send(UndeliveredTaskCommand, { task: id, reason: "no window" }));
	check("an undelivered message leaves a To do task as it is", untouched.status, "todo");
	const sent = bench();
	const back = await startedCodeTask(sent.tasks, "Send me back");
	await readyForTest(sent.tasks, back);
	outputOf(await sent.tasks.send(MoveTaskCommand, { chat: A, task: back, to: "ready_to_test" }));
	const answer = outputOf(
		await sent.tasks.send(SendBackTaskCommand, { task: back, note: "still overlaps", chat: null }),
	);
	const reopened = outputOf(await sent.tasks.send(TaskQuery, { task: back }));
	check(
		"send back with no live chat puts it in To do for any chat",
		[answer.chat, reopened.card.status, reopened.card.owner, answer.message.includes("task_start")],
		[null, "todo", null, true],
	);
	check("with the note as a new criterion", reopened.acceptance.at(-1)?.text, "still overlaps");
}

async function usageLimitWaits(): Promise<void> {
	const { tasks, clock } = bench();
	const id = await startedCodeTask(tasks, "Hits the limit");
	const resumesAt = START + 2 * HOUR;
	outputOf(
		await tasks.send(SettleTurnCommand, {
			chat: A,
			turn: "1",
			ended: "failed",
			turnStartedAt: START,
			startedBy: "host",
			failure: { kind: "usage_limit", detail: "You've hit your usage limit", resumesAt },
		}),
	);
	const waiting = outputOf(await tasks.send(TaskQuery, { task: id })).card;
	check(
		"a usage limit blocks it until the reset",
		[waiting.blocker?.kind, waiting.continueAt, waiting.actions.includes("continue")],
		["usage_limit", resumesAt, true],
	);
	const early = reasonOf(await tasks.send(ContinueTaskCommand, { task: id, chat: A }));
	check("continue before the reset is refused", early.includes("usage limit to reset in 120 min"), true);
	clock.moveTo(resumesAt + 1);
	check(
		"after the reset it continues at once",
		outputOf(await tasks.send(TaskQuery, { task: id })).card.continueAt,
		null,
	);
	check("and continue works", outputOf(await tasks.send(ContinueTaskCommand, { task: id, chat: A })).chat, A);
	const failed = outputOf(
		await tasks.send(SettleTurnCommand, {
			chat: A,
			turn: "2",
			ended: "failed",
			turnStartedAt: START,
			startedBy: "host",
			failure: { kind: "other", detail: "x".repeat(900), resumesAt: null },
		}),
	);
	const blocked = outputOf(await tasks.send(TaskQuery, { task: id })).card;
	check(
		"another failure blocks as session_failed with the detail capped",
		[failed.followUp, blocked.blocker?.kind, blocked.blocker?.detail.length],
		[null, "session_failed", 600],
	);
}

async function closedOrder(): Promise<void> {
	const { tasks, clock } = bench();

	for (const title of ["Closed first", "Closed second"]) {
		const research = outputOf(
			await tasks.send(CreateTaskCommand, {
				chat: A,
				title,
				kind: "research",
				acceptance: ["an answer"],
				plan: ["read"],
			}),
		).task.card.id;
		outputOf(await tasks.send(StartTaskCommand, { chat: A, task: research }));
		outputOf(await tasks.send(MarkStepCommand, { chat: A, task: research, step: "S1", state: "done" }));
		outputOf(
			await tasks.send(CheckCriterionCommand, {
				chat: A,
				task: research,
				criterion: "C1",
				state: "met",
				evidence: "docs/answer.md",
			}),
		);
		outputOf(await tasks.send(MoveTaskCommand, { chat: A, task: research, to: "done" }));
		clock.moveTo(START + HOUR);
	}

	const titlesOf = async (order: "newest" | "oldest") =>
		outputOf(await tasks.send(BoardQuery, { closedOrder: order }))
			.columns.find((column) => column.status === "done")
			?.cards.map((card) => card.title);
	check("Done shows the newest first by default", await titlesOf("newest"), ["Closed second", "Closed first"]);
	check("Oldest first shows the oldest", await titlesOf("oldest"), ["Closed first", "Closed second"]);
	const view = outputOf(await tasks.send(TaskQuery, { task: "T-1" }));
	check(
		"a card carries its status label and whether it is closed",
		[view.card.statusLabel, view.card.isClosed],
		["Done", true],
	);
	check(
		"its log entries carry their status labels",
		[view.log.at(-1)?.fromLabel, view.log.at(-1)?.toLabel],
		["In progress", "Done"],
	);
}

await creating();
await starting();
await finishing();
await stopGuard();
await watchdog();
await blockers();
await staleness();
await unansweredTestCloses();
await reading();
await caps();
await sendBackAtTheCap();
await nudgeResets();
await onlyNudgedTasksFollowUp();
await startedMidTurn();
await draftedTurnPauses();
await progressStaysCapped();
undeliveredToasts();
await agentCarriesOutThePersonsWord();
await continuing();
await usageLimitWaits();
await closedOrder();

if (tally.failed > 0) {
	console.log(`tasks: ${tally.failed} check(s) failed`);
	process.exit(1);
}

console.log("tasks: all checks passed");
process.exit(0);
