import type { BoardStep, TakenStep } from "../../shared/lib/task-moves.js";
import type { TaskFinder } from "../../shared/lib/task-refs.js";
import type { Board, Task } from "../../shared/schema/task.schema.js";

export interface HeldBoard {
	readonly board: Board;
	readonly rev: number;
}

export interface BoardWrite {
	readonly baseRev: number;
	readonly reason: string;
}

export type SavedBoard =
	| {
			readonly ok: true;
	  }
	| {
			readonly ok: false;
			readonly why: "stale" | "read-only";
	  };

export interface RefusedChange {
	readonly ok: false;
	readonly refusal: string;
}

export type ChangedBoard =
	| {
			readonly ok: true;
			readonly board: Board;
			readonly reason: string;
			readonly isChanged: boolean;
			readonly changedTasks: readonly number[];
	  }
	| RefusedChange;

export type ChangedTask =
	| {
			readonly ok: true;
			readonly board: Board;
			readonly task: Task;
			readonly isChanged: boolean;
	  }
	| RefusedChange;

export const SAVED_BOARD: SavedBoard = {
	ok: true,
};

export const STALE_BOARD: SavedBoard = {
	ok: false,
	why: "stale",
};

export const READ_ONLY_BOARD: SavedBoard = {
	ok: false,
	why: "read-only",
};

const MOST_TRIES = 6;
const RETRY_MS = 15;
const KEPT_CHANGING = "The tasks file kept changing while this was written; try again.";
const LOST = "{named} was written but is no longer on the board.";
const READ_ONLY_REFUSAL =
	"The tasks file is read-only here: a newer Sumi wrote it, or it no longer matches its shape. Nothing was written.";

export abstract class TasksGateway {
	abstract board(): Promise<HeldBoard>;
	abstract saveBoard(board: Board, write: BoardWrite): Promise<SavedBoard>;
	abstract boardChanged(listener: () => void): () => void;

	async changeBoard(next: (board: Board) => BoardStep): Promise<ChangedBoard> {
		for (let attempt = 0; attempt < MOST_TRIES; attempt += 1) {
			const changed = await this.changeOnce(next, attempt);

			if (changed !== null) {
				return changed;
			}

			await new Promise((waited) => setTimeout(waited, RETRY_MS * (attempt + 1)));
		}

		return refusedChange(KEPT_CHANGING);
	}

	async changeTask(next: (board: Board) => BoardStep, { find, named }: TaskFinder): Promise<ChangedTask> {
		const changed = await this.changeBoard(next);

		if (!changed.ok) {
			return changed;
		}

		const task = find(changed.board);

		if (task === null) {
			return refusedChange(LOST.replace("{named}", named));
		}

		return {
			ok: true,
			board: changed.board,
			task,
			isChanged: changed.isChanged,
		};
	}

	private async changeOnce(next: (board: Board) => BoardStep, attempt: number): Promise<ChangedBoard | null> {
		const held = await this.board();
		const step = next(held.board);

		if ("refusal" in step) {
			console.info(`[tasks] refused: ${step.refusal.split("\n")[0]}`);
			return refusedChange(step.refusal);
		}

		if (step.board === held.board) {
			console.info(`[tasks] ${step.reason} → board unchanged, nothing written`);
			return answeredChange(held.board, step, []);
		}

		return this.saveChange(held, step, attempt);
	}

	private async saveChange(held: HeldBoard, step: TakenStep, attempt: number): Promise<ChangedBoard | null> {
		const saved = await this.saveBoard(step.board, {
			baseRev: held.rev,
			reason: step.reason,
		});

		if (saved.ok) {
			console.info(`[tasks] ${step.reason}`);
			return answeredChange(held.board, step, changedTasksOf(held.board, step.board));
		}

		if (saved.why === "read-only") {
			return refusedChange(READ_ONLY_REFUSAL);
		}

		console.info(`[tasks] ${step.reason} → rev moved on, read again (try ${attempt + 1})`);
		return null;
	}
}

function refusedChange(refusal: string): RefusedChange {
	return {
		ok: false,
		refusal,
	};
}

function answeredChange(was: Board, step: TakenStep, changedTasks: readonly number[]): ChangedBoard {
	return {
		ok: true,
		board: step.board,
		reason: step.reason,
		isChanged: step.board !== was,
		changedTasks,
	};
}

function changedTasksOf(was: Board, now: Board): number[] {
	const kept = new Set(was.tasks);
	return now.tasks.filter((task) => !kept.has(task)).map((task) => task.number);
}
