import type { Board, Task } from "../packages/domain/tasks/generated/contract.ts";
import { MOST_BOARD_BYTES } from "../packages/domain/tasks/shared/schema/kept-board.schema.ts";
import { check } from "./check-helpers.ts";
import { frameStorageOn, keptOn, reasonOf, seededStore, shellOver, taskIn, withTask } from "./tasks-app-fixture.ts";

const OPEN_TASK = 140;
const READY_TASK = 147;

interface RefusedWrite {
	readonly what: string;
	readonly boardOf: (held: Board) => Board;
	readonly said: string;
}

const WORKPLACE = {
	folder: "~/Projects/elsewhere",
	branch: null,
	worktree: null,
	at: 1,
};

const REFUSED_WRITES: readonly RefusedWrite[] = [
	{
		what: "the next number going down",
		boardOf: (held) => ({ ...held, nextNumber: held.nextNumber - 1 }),
		said: "only grows",
	},
	{
		what: "a task leaving the board",
		boardOf: (held) => ({ ...held, tasks: held.tasks.filter((task) => task.number !== OPEN_TASK) }),
		said: "T-140 left the board",
	},
	{
		what: "a task's chats changing",
		boardOf: (held) => withTask(held, OPEN_TASK, { chats: ["chat-from-app"] }),
		said: "T-140: chats belongs to Sumi's chats",
	},
	{
		what: "a task's workplaces changing",
		boardOf: (held) => withTask(held, OPEN_TASK, { workplaces: [WORKPLACE] }),
		said: "T-140: workplaces belongs to Sumi's chats",
	},
	{
		what: "a task's owner changing",
		boardOf: (held) => withTask(held, OPEN_TASK, { owner: "chat-from-app" }),
		said: "T-140: owner belongs to Sumi's chats",
	},
	{
		what: "a status move the task rules forbid",
		boardOf: (held) => withTask(held, OPEN_TASK, { status: "done" }),
		said: "T-140 cannot go from backlog to done",
	},
	{
		what: "a criterion met with no evidence",
		boardOf: (held) => withCriterion(held, { state: "met", evidence: null }),
		said: "Marking c2 met needs evidence",
	},
	{
		what: "a criterion dropped with no reason",
		boardOf: (held) => withCriterion(held, { state: "dropped", reason: null }),
		said: "Dropping c2 needs the reason",
	},
	{
		what: "a criterion leaving its task",
		boardOf: (held) => withTask(held, OPEN_TASK, { acceptance: taskIn(held, OPEN_TASK).acceptance.slice(0, 1) }),
		said: "T-140: criterion c2 left the task",
	},
	{
		what: "a new task carrying a chat",
		boardOf: (held) => withNewTask(held, { number: held.nextNumber, chats: ["chat-from-app"] }),
		said: "chats belongs to Sumi's chats",
	},
	{
		what: "a new task under the next number",
		boardOf: (held) => withNewTask(held, { number: 1 }),
		said: "is new but its number is below the board's next number",
	},
];

export async function replaceRuleChecks(): Promise<void> {
	const shell = shellOver(seededStore());
	const storage = frameStorageOn(shell);

	for (const refused of REFUSED_WRITES) {
		const { board, rev } = await keptOn(shell);
		const answer = await storage({ op: "write", key: "tasks", doc: refused.boardOf(board), baseRev: rev });
		check(`refused: ${refused.what}`, reasonOf(answer).includes(refused.said), true);

		if (answer.ok) {
			console.log(reasonOf(answer));
		}
	}

	check("and none of them was written", (await keptOn(shell)).rev, 1);

	const { board, rev } = await keptOn(shell);
	const accepted = withTask(withTask(board, READY_TASK, { status: "done" }), OPEN_TASK, {
		title: "Renamed by the app",
	});
	check(
		"a person's move and an edit the rules allow land",
		await storage({ op: "write", key: "tasks", doc: accepted, baseRev: rev }),
		{
			ok: true,
			output: { ok: true, rev: 2 },
		},
	);
	await boundChecks();
}

async function boundChecks(): Promise<void> {
	const shell = shellOver(seededStore());
	const storage = frameStorageOn(shell);
	const { board, rev } = await keptOn(shell);
	const huge = taskIn(board, OPEN_TASK);
	const description = "x".repeat(40_000);
	const bloated: Board = {
		nextNumber: board.nextNumber + 500,
		tasks: [
			...board.tasks,
			...Array.from({ length: 500 }, (_, at) => ({ ...huge, number: board.nextNumber + at, description })),
		],
	};
	check(
		`a board over ${MOST_BOARD_BYTES} bytes is refused`,
		reasonOf(await storage({ op: "write", key: "tasks", doc: bloated, baseRev: rev })).includes(
			"a written board holds at most",
		),
		true,
	);

	const writes = await Promise.all(
		Array.from({ length: 60 }, () => storage({ op: "write", key: "tasks", doc: board, baseRev: 0 })),
	);
	const limited = writes.filter((answer) => !answer.ok && answer.reason.includes("called too often"));
	check("the 61st write in a minute is refused as a refusal the app can read", limited.length, 1);
}

function withCriterion(held: Board, change: Partial<Task["acceptance"][number]>): Board {
	const task = taskIn(held, OPEN_TASK);
	return withTask(held, OPEN_TASK, {
		acceptance: task.acceptance.map((criterion) => (criterion.id === "c2" ? { ...criterion, ...change } : criterion)),
	});
}

function withNewTask(held: Board, change: Partial<Task>): Board {
	const task: Task = {
		...taskIn(held, OPEN_TASK),
		chats: [],
		workplaces: [],
		owner: null,
		...change,
	};
	return {
		...held,
		nextNumber: Math.max(held.nextNumber, task.number + 1),
		tasks: [...held.tasks, task],
	};
}
