import type { DocKind, StoreClient, StoreRoot } from "@widgetarium/behaviors/tauri-store";
import { BoardSchema } from "../../shared/schema/task.schema.js";
import type { Board } from "../../shared/schema/task.schema.js";
import { EMPTY_BOARD } from "./memory.gateway.js";
import { READ_ONLY_BOARD, SAVED_BOARD, STALE_BOARD, TasksGateway } from "./tasks.gateway.js";
import type { BoardWrite, HeldBoard, SavedBoard } from "./tasks.gateway.js";

export const KEPT_TASKS: DocKind<Board> = {
	file: "tasks.json",
	v: 1,
	schema: BoardSchema,
};

const READ_ONLY_WARNING =
	"[tasks] tasks.json is read-only here (a newer Sumi wrote it, or it does not match its shape): nothing was written";

export class TauriTasksGateway extends TasksGateway {
	private readonly listeners = new Set<() => void>();

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
			rev: read.isReadOnly ? -1 : read.rev,
		};
	}

	async saveBoard(board: Board, { baseRev, reason }: BoardWrite): Promise<SavedBoard> {
		if (baseRev < 0) {
			console.warn(READ_ONLY_WARNING);
			return READ_ONLY_BOARD;
		}

		const replaced = await this.store.replaceDoc(this.root, KEPT_TASKS, {
			doc: board,
			baseRev,
			reason,
		});

		if (replaced.ok) {
			this.tell();
		}

		return replaced.ok ? SAVED_BOARD : STALE_BOARD;
	}

	boardChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	private tell(): void {
		for (const listener of [...this.listeners]) {
			listener();
		}
	}
}
