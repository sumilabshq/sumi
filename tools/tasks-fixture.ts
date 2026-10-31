import type { Board, Task, TaskStatus, Transition } from "../packages/domain/tasks/shared/schema/task.schema.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const WORKING_CHAT = "chat-tasks-design";
export const PANES_CHAT = "chat-panes";
export const LISTED_CHAT_TITLES: Readonly<Record<string, string>> = {
	[WORKING_CHAT]: "Tasks design",
	[PANES_CHAT]: "Panes and windows",
};

interface Seed {
	readonly number: number;
	readonly title: string;
	readonly status: TaskStatus;
	readonly ago: number;
	readonly note?: string;
	readonly more?: Partial<Task>;
}

function stepStateAt(at: number, done: number): Task["plan"][number]["state"] {
	if (at < done) {
		return "done";
	}

	return at === done ? "active" : "pending";
}

function stepsOf(texts: readonly string[], done: number): Task["plan"] {
	return texts.map((text, at) => ({
		id: `s${at + 1}`,
		text,
		state: stepStateAt(at, done),
		note: null,
		by: at < done ? "Claude" : null,
	}));
}

function criteriaOf(texts: readonly string[], met: number): Task["acceptance"] {
	return texts.map((text, at) => ({
		id: `c${at + 1}`,
		text,
		state: at < met ? "met" : "open",
		evidence: at < met ? `test run 2, case ${at + 1}` : null,
		reason: null,
	}));
}

function taskOf(now: number, { number, title, status, ago, note = "", more = {} }: Seed): Task {
	const at = now - ago;
	const log: Transition[] = [
		{ from: null, to: "todo", by: { kind: "agent", chat: WORKING_CHAT }, reason: "", at: at - 2 * HOUR },
		...(status === "todo"
			? []
			: [{ from: "todo" as const, to: status, by: { kind: "agent" as const, chat: WORKING_CHAT }, reason: note, at }]),
	];
	return {
		number,
		title,
		description: "",
		kind: "code",
		status,
		blocker: null,
		parent: null,
		blockedBy: [],
		acceptance: criteriaOf(["It works", "It is tested", "It is reviewed"], 1),
		plan: stepsOf(["Read the code", "Write it", "Test it", "Review it"], 1),
		testPlan: null,
		documents: [],
		workplaces: [],
		owner: null,
		chats: [],
		createdBy: WORKING_CHAT,
		createdAt: at - 2 * HOUR,
		updatedAt: at,
		keptAt: null,
		nudges: 0,
		progressed: [],
		log,
		...more,
	};
}

export function seededBoard(now: number): Board {
	const seeds: readonly Seed[] = [
		{ number: 139, title: "Drop the old grid code", status: "cancelled", ago: 3 * HOUR, note: "duplicate of T-138" },
		{ number: 140, title: "Keyboard shortcuts for the board", status: "backlog", ago: 2 * DAY },
		{
			number: 141,
			title: "Model menu in the Claude strip",
			status: "paused",
			ago: 3 * HOUR,
			note: "the person asked for tab drag first",
			more: { owner: "chat-strip" },
		},
		{
			number: 143,
			title: "The usage ring shows the weekly limit",
			status: "blocked",
			ago: 40 * MINUTE,
			more: {
				blocker: {
					kind: "external",
					detail: "the usage API has no weekly field. Unblocks when the CLI reports it.",
					resumesAt: null,
				},
				workplaces: [{ folder: "~/Projects/widgetarium", branch: "feat/usage-ring", worktree: null, at: now - DAY }],
			},
		},
		{ number: 144, title: "How Claude Code tracks tasks", status: "done", ago: 9 * HOUR, more: { kind: "research" } },
		{ number: 145, title: "Tear off a browser page into its own window", status: "done", ago: 5 * HOUR },
		{
			number: 146,
			title: "Dictation pill in the composer",
			status: "in_progress",
			ago: 12 * MINUTE,
			more: {
				owner: "chat-dictation",
				workplaces: [{ folder: "~/Projects/widgetarium", branch: "feat/dictation", worktree: null, at: now - DAY }],
			},
		},
		{
			number: 148,
			title: "Design tasks: the entity, the board and the chat line",
			status: "in_progress",
			ago: 1 * MINUTE,
			more: {
				kind: "design",
				owner: WORKING_CHAT,
				plan: stepsOf(
					["Read the chat", "Research Linear", "Write the spec", "Draw the screens", "Review", "Hand over"],
					3,
				),
			},
		},
		{
			number: 149,
			title: "Tie a permission ask to a task",
			status: "todo",
			ago: 2 * HOUR,
			more: {
				workplaces: [
					{ folder: "~/Projects/widgetarium", branch: "feat/task-permissions", worktree: null, at: now - DAY },
				],
			},
		},
		{
			number: 150,
			title: "Offer to clean up branches whose tasks are closed",
			status: "todo",
			ago: 2 * HOUR,
			more: { blockedBy: [149] },
		},
		{
			number: 151,
			title: "How Linear agents report progress on an issue",
			status: "todo",
			ago: DAY + HOUR,
			more: { kind: "research" },
		},
		{
			number: 152,
			title: "Branch cleanup offer in the board menu",
			status: "blocked",
			ago: 6 * MINUTE,
			more: {
				owner: "chat-cleanup",
				workplaces: [
					{ folder: "~/Projects/widgetarium", branch: "feat/branch-cleanup", worktree: null, at: now - DAY },
				],
				blocker: {
					kind: "session_silent",
					detail: "The session stopped answering. It may have crashed or the machine slept.",
					resumesAt: null,
				},
			},
		},
		{
			number: 153,
			title: "Compare agent dashboards in Linear and Jira",
			status: "blocked",
			ago: 22 * MINUTE,
			more: {
				kind: "research",
				owner: "chat-dashboards",
				blocker: { kind: "usage_limit", detail: "The limit resets soon.", resumesAt: now + 2 * HOUR },
			},
		},
		...[130, 131, 132].map((number) => ({
			number,
			title: `An older finished task ${number}`,
			status: "done" as const,
			ago: 3 * DAY,
		})),
	];
	return {
		nextNumber: 154,
		tasks: [...seeds.map((seed) => taskOf(now, seed)), readyToTest(now)],
	};
}

function readyToTest(now: number): Task {
	const cases = [
		"Drag a tab into a second window",
		"Drop a tab on the desktop",
		"Drag the last tab out",
		"Press Escape mid-drag",
	].map((text, at) => ({ id: `t${at + 1}`, text, expect: "the tab lands where it was dropped" }));
	const task = taskOf(now, {
		number: 147,
		title: "Drag a tab between windows",
		status: "ready_to_test",
		ago: 25 * MINUTE,
		note: "4 of 4 cases pass",
	});
	return {
		...task,
		description:
			"A tab can be dragged out of the tab list into another studio window.\n\nFound while working: macOS sends no drag events across two webviews.",
		owner: PANES_CHAT,
		chats: [PANES_CHAT],
		acceptance: criteriaOf(
			[
				"A tab dropped into another window moves there",
				"A tab dropped outside every window opens a new window",
				"The source window closes when its last tab leaves",
			],
			3,
		),
		plan: stepsOf(
			[
				"Read how the tab list starts a drag",
				"Native drag in the Tauri host",
				"Move the page between windows",
				"Tests for the drop rules",
			],
			4,
		),
		workplaces: [
			{ folder: "~/Projects/widgetarium", branch: "feat/panes-and-windows", worktree: null, at: now - 4 * HOUR },
		],
		testPlan: {
			stand: "dev build :5174, test workspace",
			cases,
			runs: [
				{
					at: now - HOUR,
					results: { t1: "passed", t2: "passed", t3: "failed", t4: "passed" },
					failures: { t3: "The source window stayed open, empty." },
					screenshots: [],
					by: "Test agent",
				},
				{
					at: now - 25 * MINUTE,
					results: { t1: "passed", t2: "passed", t3: "passed", t4: "passed" },
					failures: {},
					screenshots: [],
					by: "Test agent",
				},
			],
		},
		documents: [
			{
				id: "d1",
				kind: "spec",
				title: "Spec",
				path: "spec.md",
				body: "A tab leaves its window by a native drag. Drop rules for another window, the desktop and Escape.",
				by: "Claude",
				at: now - 2 * HOUR,
			},
			{
				id: "d2",
				kind: "research",
				title: "Research",
				path: "native-drag-macos.md",
				body: "Why DOM drag events stop at a webview edge on macOS.",
				by: "Explore agent",
				at: now - 4 * HOUR,
			},
		],
	};
}
