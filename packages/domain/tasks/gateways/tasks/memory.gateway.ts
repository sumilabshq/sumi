import type { Board } from "../../shared/schema/task.schema.js";
import { SAVED_BOARD, STALE_BOARD, TasksGateway } from "./tasks.gateway.js";
import type { BoardWrite, HeldBoard, SavedBoard } from "./tasks.gateway.js";

export const EMPTY_BOARD: Board = {
	nextNumber: 1,
	tasks: [],
};

export class MemoryTasksGateway extends TasksGateway {
	private readonly listeners = new Set<() => void>();
	private held: HeldBoard;

	constructor(board: Board = EMPTY_BOARD) {
		super();
		this.held = {
			board,
			rev: 0,
		};
	}

	board(): Promise<HeldBoard> {
		return Promise.resolve(this.held);
	}

	saveBoard(board: Board, { baseRev }: BoardWrite): Promise<SavedBoard> {
		if (baseRev !== this.held.rev) {
			return Promise.resolve(STALE_BOARD);
		}

		this.held = {
			board,
			rev: this.held.rev + 1,
		};
		for (const listener of [...this.listeners]) {
			listener();
		}

		return Promise.resolve(SAVED_BOARD);
	}

	boardChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
