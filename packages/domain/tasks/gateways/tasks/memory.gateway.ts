import type { Board } from "../../shared/schema/task.schema.js";
import { EMPTY_BOARD, TasksGateway } from "./tasks.gateway.js";
import type { BoardWrite, HeldBoard, SavedBoard } from "./tasks.gateway.js";

export { EMPTY_BOARD } from "./tasks.gateway.js";

export class MemoryTasksGateway extends TasksGateway {
	private held: HeldBoard;

	constructor(board: Board = EMPTY_BOARD) {
		super();
		this.held = {
			board,
			rev: 0,
			isReadOnly: false,
		};
	}

	board(): Promise<HeldBoard> {
		return Promise.resolve(this.held);
	}

	saveBoard(board: Board, { baseRev }: BoardWrite): Promise<SavedBoard> {
		if (baseRev !== this.held.rev) {
			return Promise.resolve({
				ok: false,
				rev: this.held.rev,
			});
		}

		this.held = {
			board,
			rev: this.held.rev + 1,
			isReadOnly: false,
		};
		this.tell();
		return Promise.resolve({
			ok: true,
			rev: this.held.rev,
		});
	}
}
