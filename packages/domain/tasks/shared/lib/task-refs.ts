import type { Board, Task, TaskStatus } from "../schema/task.schema.js";

export const DAY_MS = 86_400_000;

const TASK_PREFIX = "T-";
const REF_PATTERN = /^(?:T-)?(\d{1,7})$/i;
const NO_TASK = "There is no task {ref}. Find one with task_search or task_list.";
const CLOSED: ReadonlySet<TaskStatus> = new Set(["done", "cancelled"]);
const SHOWN_TEXT_MOST = 80;

export function idOf(number: number): string {
	return `${TASK_PREFIX}${number}`;
}

export function numberOfRef(ref: string): number | null {
	const matched = REF_PATTERN.exec(ref.trim());

	if (matched === null) {
		return null;
	}

	return Number(matched[1]);
}

export function taskOfRef(board: Board, ref: string): Task | string {
	const number = numberOfRef(ref);
	const found = board.tasks.find((task) => task.number === number);

	if (found === undefined) {
		return NO_TASK.replace("{ref}", ref);
	}

	return found;
}

export interface TaskFinder {
	readonly find: (board: Board) => Task | null;
	readonly named: string;
}

export function finderOfRef(ref: string): TaskFinder {
	return {
		find: (board) => taskOfNumber(board, numberOfRef(ref) ?? 0),
		named: ref,
	};
}

export function taskOfNumber(board: Board, number: number): Task | null {
	return board.tasks.find((task) => task.number === number) ?? null;
}

export function isClosed(status: TaskStatus): boolean {
	return CLOSED.has(status);
}

export function withTask(board: Board, changed: Task): Board {
	return {
		...board,
		tasks: board.tasks.map((task) => (task.number === changed.number ? changed : task)),
	};
}

export function oneLine(text: string): string {
	const flat = text.replace(/\s+/g, " ").trim();

	if (flat.length <= SHOWN_TEXT_MOST) {
		return flat;
	}

	return `${flat.slice(0, SHOWN_TEXT_MOST - 1)}…`;
}

export function nextIdOf(prefix: string, taken: readonly { readonly id: string }[]): string {
	const numbers = taken.map((item) => Number(item.id.slice(prefix.length))).filter((n) => Number.isInteger(n));
	return `${prefix}${Math.max(0, ...numbers) + 1}`;
}
