import { MOST_BLOCKERS, MOST_CRITERIA, MOST_STEPS } from "../schema/task.schema.js";
import type { Actor, Board, StepState, Task, TaskStatus } from "../schema/task.schema.js";
import { idOf, isClosed, taskOfNumber } from "./task-refs.js";
import { STATUS_WORDS, statusGuideOf } from "./task-words.js";

const TURNS: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
	backlog: ["todo", "in_progress", "cancelled"],
	todo: ["backlog", "in_progress", "cancelled"],
	in_progress: ["ready_to_test", "done", "paused", "blocked", "todo", "cancelled"],
	paused: ["in_progress", "blocked", "todo", "cancelled"],
	blocked: ["in_progress", "paused", "todo", "cancelled"],
	ready_to_test: ["done", "in_progress", "todo", "cancelled"],
	done: ["in_progress"],
	cancelled: ["todo"],
};

const TERMINAL_STEPS: ReadonlySet<StepState> = new Set(["done", "skipped", "cancelled"]);
const NEEDS_NOTE: ReadonlySet<TaskStatus> = new Set(["paused", "blocked", "cancelled"]);

const ALREADY = "{id} is already {status}.";
const NO_TURN = "{id} cannot go from {from} to {to}. From {from} it can go to:\n{guide}";
const NOTE_NEEDED = "Moving {id} to {to} needs a note saying why.";
const PERSONS_WORDS_NEEDED =
	"Moving {id} from {from} to {to} is the person's call: make it only when they said so in this chat, and quote their words as the note.";
const NOT_YET = "{id} cannot go to {to} yet:\n{missing}";
const OVERFLOW = "{id} would hold {count} {what}; a task holds at most {most}. Split the work into a subtask instead.";

interface Noted {
	readonly to: TaskStatus;
	readonly by: Actor;
	readonly note: string | null;
}

interface Asked {
	readonly to: TaskStatus;
	readonly by: Actor;
	readonly takenBy?: string | null;
}

const CAPS: readonly { readonly what: string; readonly most: number; readonly countOf: (task: Task) => number }[] = [
	{
		what: "acceptance criteria",
		most: MOST_CRITERIA,
		countOf: (task) => task.acceptance.length,
	},
	{
		what: "plan steps",
		most: MOST_STEPS,
		countOf: (task) => task.plan.length,
	},
	{
		what: "blocking tasks",
		most: MOST_BLOCKERS,
		countOf: (task) => task.blockedBy.length,
	},
];

export function refuseMove(board: Board, task: Task, move: Asked): string | null {
	const id = idOf(task.number);
	const turnRefusal = refuseTurn(task, move.to);

	if (turnRefusal !== null) {
		return turnRefusal;
	}

	const missing = missingFor(board, task, move);

	if (missing.length === 0) {
		return null;
	}

	return NOT_YET.replace("{id}", id)
		.replace("{to}", move.to)
		.replace("{missing}", missing.map((item) => `- ${item}`).join("\n"));
}

export function refuseOverflow(task: Task): string | null {
	const over = CAPS.find((cap) => cap.countOf(task) > cap.most);

	if (over === undefined) {
		return null;
	}

	return OVERFLOW.replace("{id}", idOf(task.number))
		.replace("{count}", String(over.countOf(task)))
		.replace("{what}", over.what)
		.replace("{most}", String(over.most));
}

export function needsNote(to: TaskStatus): boolean {
	return NEEDS_NOTE.has(to);
}

export function refuseNoteless(task: Task, { to, by, note }: Noted): string | null {
	if (note !== null && note.trim() !== "") {
		return null;
	}

	if (needsNote(to)) {
		return NOTE_NEEDED.replace("{id}", idOf(task.number)).replace("{to}", to);
	}

	if (by.kind !== "agent" || !isPersonsCall(task, to)) {
		return null;
	}

	return PERSONS_WORDS_NEEDED.replace("{id}", idOf(task.number)).replace("{from}", task.status).replace("{to}", to);
}

export function isPersonsCall({ status, kind }: Task, to: TaskStatus): boolean {
	if (isClosed(status)) {
		return true;
	}

	if (to === "done") {
		return kind === "code" || status === "ready_to_test";
	}

	return status === "ready_to_test" && to === "todo";
}

export function isTerminalStep(state: StepState): boolean {
	return TERMINAL_STEPS.has(state);
}

export function openBlockersOf(board: Board, task: Task): readonly Task[] {
	return task.blockedBy.flatMap((number) => {
		const blocker = taskOfNumber(board, number);
		return blocker !== null && !isClosed(blocker.status) ? [blocker] : [];
	});
}

function refuseTurn(task: Task, to: TaskStatus): string | null {
	if (task.status === to) {
		return ALREADY.replace("{id}", idOf(task.number)).replace("{status}", STATUS_WORDS[to]);
	}

	return TURNS[task.status].includes(to) ? null : noTurnOf(task, to);
}

function noTurnOf(task: Task, to: TaskStatus): string {
	return NO_TURN.replace(/\{id\}/g, idOf(task.number))
		.replace(/\{from\}/g, task.status)
		.replace("{to}", to)
		.replace("{guide}", statusGuideOf(TURNS[task.status]));
}

function missingFor(board: Board, task: Task, move: Asked): readonly string[] {
	if (move.to === "in_progress") {
		return missingForStart(board, task, move);
	}

	if (move.to === "ready_to_test") {
		return missingForTest(task);
	}

	if (move.to === "done" && move.by.kind !== "person") {
		return [...missingForTest(task), ...openChildrenOf(board, task)];
	}

	if (move.to === "done") {
		return openChildrenOf(board, task);
	}

	return [];
}

function missingForStart(board: Board, task: Task, move: Asked): readonly string[] {
	return [
		...missingPartsOf(task),
		...openBlockersOf(board, task).map((blocker) => `${idOf(blocker.number)} must close first (${blocker.status})`),
		...busyOwnerOf(board, task, move),
	];
}

function missingPartsOf(task: Task): readonly string[] {
	return [
		...(task.acceptance.length === 0 ? ["add at least one acceptance criterion (task_update addCriteria)"] : []),
		...(task.plan.length === 0 ? ["add at least one plan step (task_update addSteps)"] : []),
		...(task.kind === "code" && task.workplaces.length === 0
			? ["attach the folder and branch it works in (task_attach workplace)"]
			: []),
	];
}

function busyOwnerOf(board: Board, task: Task, { by, takenBy }: Asked): readonly string[] {
	const owner = takenBy ?? (by.kind === "agent" ? by.chat : task.owner);
	const busy = owner === null ? null : otherInProgressOf(board, task, owner);
	return busy === null ? [] : [`this chat already works on ${idOf(busy.number)}: pause or finish it first`];
}

function missingForTest(task: Task): readonly string[] {
	const steps = task.plan
		.filter((step) => !isTerminalStep(step.state))
		.map((step) => `step ${step.id} is ${step.state}: ${step.text}`);
	const criteria = task.acceptance
		.filter((criterion) => criterion.state === "open")
		.map((criterion) => `criterion ${criterion.id} is open: met with evidence, or dropped with a reason`);
	return [...steps, ...criteria, ...missingTests(task)];
}

function missingTests(task: Task): readonly string[] {
	if (task.kind !== "code") {
		return [];
	}

	const run = task.testPlan?.runs.at(-1);

	if (task.testPlan === null || run === undefined) {
		return ["attach a test plan and a test run on a test stand (task_attach test_plan, then test_run)"];
	}

	const failed = Object.entries(run.results)
		.filter(([, result]) => result === "failed")
		.map(([id]) => id);
	const unrun = task.testPlan.cases
		.filter((testCase) => run.results[testCase.id] === undefined)
		.map((testCase) => testCase.id);
	return [
		...(failed.length === 0 ? [] : [`the last test run failed: ${failed.join(", ")}`]),
		...(unrun.length === 0 ? [] : [`the last test run did not cover: ${unrun.join(", ")}`]),
	];
}

function openChildrenOf(board: Board, task: Task): readonly string[] {
	return board.tasks
		.filter((child) => child.parent === task.number && !isClosed(child.status))
		.map((child) => `its subtask ${idOf(child.number)} is still ${child.status}`);
}

function otherInProgressOf(board: Board, task: Task, owner: string): Task | null {
	return (
		board.tasks.find(
			(other) => other.number !== task.number && other.owner === owner && other.status === "in_progress",
		) ?? null
	);
}
