import { isTerminalStep, refuseCriterionState, refuseOverflow } from "../../../shared/lib/gates.js";
import type { BoardStep } from "../../../shared/lib/task-moves.js";
import { touchTask } from "../../../shared/lib/task-moves.js";
import { idOf, nextIdOf, oneLine } from "../../../shared/lib/task-refs.js";
import { MOST_PROGRESSED } from "../../../shared/schema/task.schema.js";
import type { Board, Step, Task, TestPlan, Workplace } from "../../../shared/schema/task.schema.js";
import type {
	AttachToTaskAsk,
	AttachedItem,
	CheckCriterionAsk,
	MarkStepAsk,
} from "../../../shared/schema/task-asks.schema.js";
import { agentOf, editableOrRefusal, nextDocIdOf, stepWith } from "./agent-edits.js";

const NOT_YOURS_YET = "{id} has no owner yet: start it with task_start before marking its steps.";
const STEP_NOTE = "Marking a step {state} needs a note saying why.";
const NO_CRITERION = "{id} has no criterion {criterion}. Its criteria: {known}.";
const NO_TEST_PLAN = "{id} has no test plan yet: attach a test_plan before a test_run.";
const UNKNOWN_CASES = "{id}'s test plan has no case {cases}. Its cases: {known}.";
const NOTED_STATES: ReadonlySet<Step["state"]> = new Set(["skipped", "blocked", "cancelled"]);
const MOST_RUNS = 20;

type Criterion = Task["acceptance"][number];

interface Marking {
	readonly chat: string;
	readonly marked: Step;
	readonly known: Step | undefined;
}

interface CheckTarget {
	readonly task: Task;
	readonly known: Criterion;
}

interface Attaching {
	readonly chat: string;
	readonly now: number;
}

export function markedStep(board: Board, ask: MarkStepAsk, now: number): BoardStep {
	const task = ownedOrRefusal(board, ask.task, ask.chat);

	if (typeof task === "string") {
		return { refusal: task };
	}

	const marking = markingOf(task, ask);
	const edited = withMarking(task, marking, now);
	const refused = refuseNotelessStep(ask) ?? refuseOverflow(edited);

	if (refused !== null) {
		return { refusal: refused };
	}

	return stepWith(
		{ board, task: edited },
		`${idOf(task.number)} step ${marking.marked.id} ${marking.known?.state ?? "none"} → ${ask.state}: ${oneLine(marking.marked.text)}`,
	);
}

export function checkedStep(board: Board, ask: CheckCriterionAsk, now: number): BoardStep {
	const target = checkTargetOrRefusal(board, ask);

	if (typeof target === "string") {
		return { refusal: target };
	}

	const { task, known } = target;
	const edited = withChecked(touchTask(task, agentOf(ask.chat), now), ask, known);
	return stepWith({ board, task: edited }, `${idOf(task.number)} criterion ${known.id} ${known.state} → ${ask.state}`);
}

export function attachedStep(board: Board, ask: AttachToTaskAsk, now: number): BoardStep {
	const task = editableOrRefusal(board, ask.task, ask.chat);

	if (typeof task === "string") {
		return { refusal: task };
	}

	const attached = attachItem(task, ask.item, {
		chat: ask.chat,
		now,
	});

	if (typeof attached === "string") {
		return { refusal: attached };
	}

	return stepWith(
		{ board, task: touchTask(attached, agentOf(ask.chat), now) },
		`${idOf(task.number)} ${ask.item.type} attached by chat ${ask.chat}`,
	);
}

function ownedOrRefusal(board: Board, ref: string, chat: string): Task | string {
	const task = editableOrRefusal(board, ref, chat);

	if (typeof task === "string" || task.owner !== null) {
		return task;
	}

	return NOT_YOURS_YET.replace("{id}", idOf(task.number));
}

function refuseNotelessStep(ask: MarkStepAsk): string | null {
	if (!NOTED_STATES.has(ask.state) || (ask.note !== null && ask.note.trim() !== "")) {
		return null;
	}

	return STEP_NOTE.replace("{state}", ask.state);
}

function markingOf(task: Task, ask: MarkStepAsk): Marking {
	const known = task.plan.find((step) => step.id.toLowerCase() === ask.step.toLowerCase() || step.text === ask.step);
	return {
		chat: ask.chat,
		known,
		marked: {
			id: known?.id ?? nextIdOf("S", task.plan),
			text: known?.text ?? ask.step,
			state: ask.state,
			note: ask.note,
			by: ask.chat,
		},
	};
}

function withMarking(task: Task, { chat, marked, known }: Marking, now: number): Task {
	const touched = touchTask(task, agentOf(chat), now);
	const planned = {
		...touched,
		plan: planWithMarked(task.plan, marked, known),
	};
	return known !== undefined && isTerminalStep(marked.state) ? withProgress(planned, known.id) : planned;
}

function withProgress(task: Task, settledId: string): Task {
	if (task.progressed.includes(settledId)) {
		return task;
	}

	return {
		...task,
		progressed: [...task.progressed, settledId].slice(-MOST_PROGRESSED),
		nudges: 0,
	};
}

function planWithMarked(plan: readonly Step[], marked: Step, known: Step | undefined): Step[] {
	const placed = known === undefined ? [...plan, marked] : plan.map((step) => (step.id === marked.id ? marked : step));

	if (marked.state !== "active") {
		return placed;
	}

	return placed.map((step): Step =>
		step.id !== marked.id && step.state === "active" ? { ...step, state: "pending" } : step,
	);
}

function checkTargetOrRefusal(board: Board, ask: CheckCriterionAsk): CheckTarget | string {
	const task = ownedOrRefusal(board, ask.task, ask.chat);

	if (typeof task === "string") {
		return task;
	}

	const known = task.acceptance.find((criterion) => criterion.id.toLowerCase() === ask.criterion.toLowerCase());

	if (known === undefined) {
		return noCriterionOf(task, ask.criterion);
	}

	return (
		refuseCriterionState(ask, known.id) ?? {
			task,
			known,
		}
	);
}

function noCriterionOf(task: Task, criterion: string): string {
	return NO_CRITERION.replace("{id}", idOf(task.number))
		.replace("{criterion}", criterion)
		.replace("{known}", task.acceptance.map((kept) => kept.id).join(", ") || "none");
}

function withChecked(task: Task, ask: CheckCriterionAsk, known: Criterion): Task {
	const checked = {
		...task,
		acceptance: task.acceptance.map((criterion) =>
			criterion.id === known.id ? checkedCriterion(criterion, ask) : criterion,
		),
	};
	return ask.state === "open" ? checked : withProgress(checked, known.id);
}

function checkedCriterion(criterion: Criterion, ask: CheckCriterionAsk): Criterion {
	return {
		...criterion,
		state: ask.state,
		evidence: ask.state === "met" ? ask.evidence : null,
		reason: ask.state === "dropped" ? ask.reason : null,
	};
}

function attachItem(task: Task, item: AttachedItem, attaching: Attaching): Task | string {
	if (item.type === "workplace") {
		return {
			...task,
			workplaces: withWorkplace(task.workplaces, {
				folder: item.folder,
				branch: item.branch,
				worktree: item.worktree,
				at: attaching.now,
			}),
		};
	}

	if (item.type === "document") {
		const doc = {
			id: nextDocIdOf(task),
			kind: item.kind,
			title: item.title,
			path: item.path,
			body: item.body,
			by: attaching.chat,
			at: attaching.now,
		};
		return { ...task, documents: [...task.documents.filter((kept) => kept.title !== item.title), doc].slice(-30) };
	}

	if (item.type === "test_plan") {
		const cases = item.cases.map((testCase, at) => ({
			id: `K${at + 1}`,
			text: testCase.text,
			expect: testCase.expect,
		}));
		return { ...task, testPlan: { stand: item.stand, cases, runs: [] } };
	}

	return attachRun(task, item, attaching);
}

function attachRun(task: Task, item: Extract<AttachedItem, { type: "test_run" }>, attaching: Attaching): Task | string {
	if (task.testPlan === null) {
		return NO_TEST_PLAN.replace("{id}", idOf(task.number));
	}

	const known = new Set(task.testPlan.cases.map((testCase) => testCase.id));
	const unknown = Object.keys(item.results).filter((id) => !known.has(id));

	if (unknown.length > 0) {
		return UNKNOWN_CASES.replace("{id}", idOf(task.number))
			.replace("{cases}", unknown.join(", "))
			.replace("{known}", [...known].join(", "));
	}

	const plan: TestPlan = {
		...task.testPlan,
		runs: [
			...task.testPlan.runs,
			{
				at: attaching.now,
				results: item.results,
				failures: item.failures,
				screenshots: item.screenshots,
				by: attaching.chat,
			},
		].slice(-MOST_RUNS),
	};
	return { ...task, testPlan: plan };
}

function withWorkplace(kept: readonly Workplace[], added: Workplace): Workplace[] {
	const others = kept.filter((place) => place.folder !== added.folder || place.branch !== added.branch);
	return [...others, added].slice(-20);
}
