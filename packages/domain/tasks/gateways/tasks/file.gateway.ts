import { z } from "zod";
import type { BoardFile } from "../../shared/host/tasks.host.js";
import { BoardSchema } from "../../shared/schema/task.schema.js";
import type { Board } from "../../shared/schema/task.schema.js";
import { EMPTY_BOARD, TasksGateway } from "./tasks.gateway.js";
import type { BoardWrite, HeldBoard, SavedBoard } from "./tasks.gateway.js";

const READ_ONLY_WARNING = "[tasks] the board file does not match its shape, so it is read-only here";

const NO_FILE_YET: HeldBoard = {
	board: EMPTY_BOARD,
	rev: 0,
	isReadOnly: false,
};

const KeptFileSchema = z.object({
	rev: z.number().int().nonnegative(),
	board: z.unknown(),
});

export class FileTasksGateway extends TasksGateway {
	constructor(private readonly file: BoardFile) {
		super();
	}

	async board(): Promise<HeldBoard> {
		const text = await this.file.read();
		return text === null ? NO_FILE_YET : heldBoardOf(text);
	}

	// TRADE-OFF: the rev is read, then written; the app is the file's one writer, and FileSystem has no compare-and-write yet
	async saveBoard(board: Board, { baseRev }: BoardWrite): Promise<SavedBoard> {
		const held = await this.board();

		if (held.rev !== baseRev) {
			return {
				ok: false,
				rev: held.rev,
			};
		}

		const rev = held.rev + 1;
		await this.file.write(JSON.stringify({ rev, board }));
		this.tell();
		return {
			ok: true,
			rev,
		};
	}
}

function heldBoardOf(text: string): HeldBoard {
	const kept = KeptFileSchema.safeParse(jsonOf(text));
	const rev = kept.data?.rev ?? 0;
	const board = BoardSchema.safeParse(kept.data?.board);

	if (!board.success) {
		console.warn(READ_ONLY_WARNING, (kept.success ? board.error : kept.error).issues);
		return {
			board: EMPTY_BOARD,
			rev,
			isReadOnly: true,
		};
	}

	return {
		board: board.data,
		rev,
		isReadOnly: false,
	};
}

function jsonOf(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
