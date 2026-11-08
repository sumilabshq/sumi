import type { Board, Task, TaskStatus } from "../schema/task.schema.js";
import type { BoardAsk, SearchAsk, TasksAsk } from "../schema/task-asks.schema.js";
import type {
	BoardAnswer,
	BoardColumn,
	ClosedOrder,
	ClosedWithin,
	TaskCard,
	TaskPage,
	UpdatedWithin,
} from "../schema/task-view.schema.js";
import { cardOf, closedAtOf } from "./task-cards.js";
import { DAY_MS, isClosed } from "./task-refs.js";
import { STATUS_WORDS } from "./task-words.js";

const COLUMNS: readonly (readonly [TaskStatus, readonly TaskStatus[]])[] = [
	["backlog", ["backlog"]],
	["todo", ["todo"]],
	["in_progress", ["in_progress", "blocked"]],
	["paused", ["paused"]],
	["ready_to_test", ["ready_to_test"]],
	["done", ["done"]],
	["cancelled", ["cancelled"]],
];

const COLUMN_MOST = 100;
const SEARCH_MOST = 20;
const SEARCH_CLOSED_WITHIN_MS = 7 * DAY_MS;

const WITHIN_MS: Readonly<Record<UpdatedWithin, number>> = {
	day: DAY_MS,
	week: 7 * DAY_MS,
	month: 30 * DAY_MS,
	all: Number.POSITIVE_INFINITY,
};

const CLOSED_WITHIN_MS: Readonly<Record<ClosedWithin, number>> = {
	none: -1,
	day: DAY_MS,
	week: 7 * DAY_MS,
	month: 30 * DAY_MS,
	all: Number.POSITIVE_INFINITY,
};

export function boardAnswerOf(board: Board, ask: BoardAsk, now: number): BoardAnswer {
	const cards = board.tasks
		.filter((task) => isAsked(task, ask))
		.sort((a, b) => b.updatedAt - a.updatedAt)
		.map((task) => cardOf(board, task, now))
		.filter((card) => !ask.isYourTurnOnly || card.isYourTurn);
	const columns = COLUMNS.map(([status, holds]) =>
		columnOf(
			status,
			cards.filter((card) => holds.includes(card.status)),
			{ ask, now },
		),
	);
	return {
		columns,
		waitingForYou: cards.filter((card) => card.isYourTurn).length,
		inProgress: cards.filter((card) => card.status === "in_progress").length,
	};
}

export function pageOf(board: Board, ask: TasksAsk, now: number): TaskPage {
	const offset = Number(ask.cursor ?? "0") || 0;
	const found = board.tasks
		.filter((task) => isListed(task, ask, now))
		.sort((a, b) => b.updatedAt - a.updatedAt)
		.map((task) => cardOf(board, task, now));
	const items = found.slice(offset, offset + ask.limit);
	const end = offset + items.length;
	return {
		items,
		next: end < found.length ? String(end) : null,
		total: found.length,
	};
}

export function searchOf(board: Board, ask: SearchAsk, now: number): readonly TaskCard[] {
	const words = ask.query
		.toLowerCase()
		.split(/\s+/)
		.filter((word) => word.length > 1);
	return board.tasks
		.filter((task) => isSearchable(task, ask, now))
		.map((task) => ({
			task,
			score: scoreOf(task, words),
		}))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || b.task.updatedAt - a.task.updatedAt)
		.slice(0, SEARCH_MOST)
		.map(({ task }) => cardOf(board, task, now));
}

export function sameOpenTitleOf(board: Board, title: string): Task | null {
	const wanted = normalTitleOf(title);
	return board.tasks.find((task) => !isClosed(task.status) && normalTitleOf(task.title) === wanted) ?? null;
}

function normalTitleOf(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
}

function columnOf(
	status: TaskStatus,
	cards: readonly TaskCard[],
	{ ask, now }: { readonly ask: BoardAsk; readonly now: number },
): BoardColumn {
	const isClosedColumn = isClosed(status);
	const shown = isClosedColumn ? closedShownOf(cards, ask, now) : cards;
	return {
		status,
		label: STATUS_WORDS[status],
		isClosed: isClosedColumn,
		cards: shown.slice(0, COLUMN_MOST),
		total: cards.length,
		count: isClosedColumn ? Math.min(shown.length, COLUMN_MOST) : cards.length,
		hidden: cards.length - Math.min(shown.length, COLUMN_MOST),
	};
}

function closedShownOf(cards: readonly TaskCard[], ask: BoardAsk, now: number): readonly TaskCard[] {
	return cards.filter((card) => isClosedWithin(card, ask.closedWithin, now)).sort(closedOrderOf(ask.closedOrder));
}

function closedOrderOf(order: ClosedOrder): (a: TaskCard, b: TaskCard) => number {
	const sign = order === "oldest" ? 1 : -1;
	return (a, b) => sign * ((a.closedAt ?? 0) - (b.closedAt ?? 0));
}

function isClosedWithin(card: TaskCard, within: ClosedWithin, now: number): boolean {
	return card.closedAt !== null && now - card.closedAt <= CLOSED_WITHIN_MS[within];
}

function isAsked(task: Task, ask: Pick<BoardAsk, "kind" | "owner">): boolean {
	return (ask.kind === null || task.kind === ask.kind) && (ask.owner === null || task.owner === ask.owner);
}

function isListed(task: Task, ask: TasksAsk, now: number): boolean {
	if (ask.asking !== null && task.owner === ask.asking && !isClosed(task.status)) {
		return true;
	}

	return (
		isAsked(task, ask) &&
		(ask.status.length === 0 || ask.status.includes(task.status)) &&
		now - task.updatedAt <= WITHIN_MS[ask.updatedWithin]
	);
}

function isSearchable(task: Task, ask: SearchAsk, now: number): boolean {
	if (!isClosed(task.status)) {
		return true;
	}

	return ask.includeClosed || now - (closedAtOf(task) ?? task.updatedAt) <= SEARCH_CLOSED_WITHIN_MS;
}

function scoreOf(task: Task, words: readonly string[]): number {
	const title = task.title.toLowerCase();
	const description = task.description.toLowerCase();

	if (!words.every((word) => title.includes(word) || description.includes(word))) {
		return 0;
	}

	return words.reduce(
		(score, word) => score + (title.includes(word) ? 3 : 0) + (description.includes(word) ? 1 : 0),
		0,
	);
}
