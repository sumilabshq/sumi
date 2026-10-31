import type { DocStore } from "@sumi/contract";
import { TASKS_DOC_KEY } from "../../shared/schema/kept-board.schema.js";
import { BoardSchema } from "../../shared/schema/task.schema.js";
import type { Board } from "../../shared/schema/task.schema.js";
import { EMPTY_BOARD, TasksGateway } from "./tasks.gateway.js";
import type { BoardWrite, HeldBoard, SavedBoard } from "./tasks.gateway.js";

const READ_ONLY_WARNING = "[tasks] the stored board does not match its shape, so it is read-only here";

export class StorageTasksGateway extends TasksGateway {
	constructor(private readonly storage: DocStore) {
		super();
	}

	async board(): Promise<HeldBoard> {
		const kept = await this.storage.read(TASKS_DOC_KEY);

		if (kept.doc === undefined || kept.doc === null) {
			return {
				board: EMPTY_BOARD,
				rev: kept.rev,
				isReadOnly: false,
			};
		}

		const read = BoardSchema.safeParse(kept.doc);

		if (!read.success) {
			console.warn(READ_ONLY_WARNING, read.error.issues);
		}

		return {
			board: read.success ? read.data : EMPTY_BOARD,
			rev: kept.rev,
			isReadOnly: !read.success,
		};
	}

	async saveBoard(board: Board, { baseRev }: BoardWrite): Promise<SavedBoard> {
		const written = await this.storage.write(TASKS_DOC_KEY, board, baseRev);

		if (written.ok) {
			this.tell();
		}

		return written;
	}

	// TODO: hear writes made outside this page once the contract carries a storage change event.
}
