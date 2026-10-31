import type { DocKind, StoreClient, StoreRoot } from "@widgetarium/behaviors/tauri-store";
import { BoardSchema } from "../../shared/schema/task.schema.js";
import type { Board } from "../../shared/schema/task.schema.js";
import { EMPTY_BOARD, TasksGateway } from "./tasks.gateway.js";
import type { BoardWrite, HeldBoard, SavedBoard } from "./tasks.gateway.js";

export const KEPT_TASKS: DocKind<Board> = {
	file: "tasks.json",
	v: 1,
	schema: BoardSchema,
};

export class TauriTasksGateway extends TasksGateway {
	constructor(
		private readonly store: StoreClient,
		private readonly root: StoreRoot,
	) {
		super();
		store.watchForeignWrites(root, KEPT_TASKS.file, () => this.tell());
	}

	async board(): Promise<HeldBoard> {
		const read = await this.store.readDoc(this.root, KEPT_TASKS);
		return {
			board: read.doc ?? EMPTY_BOARD,
			rev: read.rev,
			isReadOnly: read.isReadOnly,
		};
	}

	async saveBoard(board: Board, { baseRev, reason }: BoardWrite): Promise<SavedBoard> {
		const replaced = await this.store.replaceDoc(this.root, KEPT_TASKS, {
			doc: board,
			baseRev,
			reason,
		});

		if (!replaced.ok) {
			return {
				ok: false,
				rev: replaced.currentRev,
			};
		}

		this.tell();
		return replaced;
	}
}
