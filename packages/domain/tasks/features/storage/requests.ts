import { Repeatable, command, minutes, query, rateLimit, refuse } from "@widgetarium/core/requests";
import type { RateLimit } from "@widgetarium/core/requests";
import { TasksGateway } from "../../gateways/tasks/tasks.gateway.js";
import { refuseBoardReplace } from "../../shared/lib/board-replace.js";
import {
	BoardReplaceSchema,
	BoardReplacedSchema,
	KeptBoardSchema,
	MOST_BOARD_BYTES,
} from "../../shared/schema/kept-board.schema.js";
import type { BoardReplaced } from "../../shared/schema/kept-board.schema.js";

const READ_ONLY =
	"The tasks file is read-only here: a newer Sumi wrote it, or it no longer matches its shape. Nothing was read or written.";
const TOO_BIG = "The board is {bytes} bytes; a written board holds at most {most}. Nothing was written.";
const REPLACED = "an installed app replaced the board at rev {rev}";
const KEPT_BOARD_READS: RateLimit = {
	calls: 1200,
	per: minutes(1),
};
const KEPT_BOARD_WRITES: RateLimit = {
	calls: 60,
	per: minutes(1),
};

// TODO: keep these two off the planned MCP tools: an agent edits tasks through the per-task commands.
export const KeptBoardQuery = query("kept-board")
	.output(KeptBoardSchema)
	.use(rateLimit(KEPT_BOARD_READS))
	.inject({ tasks: TasksGateway })
	.handle(async (_input, { tasks }) => {
		const held = await tasks.board();

		if (held.isReadOnly) {
			return refuse(READ_ONLY);
		}

		return {
			board: held.board,
			rev: held.rev,
		};
	});

export const ReplaceKeptBoardCommand = command("replace-kept-board")
	.input(BoardReplaceSchema)
	.output(BoardReplacedSchema)
	.idempotencyKey(Repeatable)
	.use(rateLimit(KEPT_BOARD_WRITES))
	.inject({ tasks: TasksGateway })
	.handle(async ({ board, baseRev }, { tasks }): Promise<BoardReplaced> => {
		const bytes = new TextEncoder().encode(JSON.stringify(board)).length;

		if (bytes > MOST_BOARD_BYTES) {
			return refuse(TOO_BIG.replace("{bytes}", String(bytes)).replace("{most}", String(MOST_BOARD_BYTES)));
		}

		const held = await tasks.board();

		if (held.isReadOnly) {
			return refuse(READ_ONLY);
		}

		if (held.rev !== baseRev) {
			return staleOver(baseRev, held.rev);
		}

		const ruleRefusal = refuseBoardReplace(held.board, board);

		if (ruleRefusal !== null) {
			console.info(`[tasks] an installed app's board at rev ${baseRev} refused: ${ruleRefusal}`);
			return refuse(ruleRefusal);
		}

		const saved = await tasks.saveBoard(board, {
			baseRev,
			reason: REPLACED.replace("{rev}", String(baseRev)),
		});

		if (saved.ok) {
			return {
				ok: true,
				rev: saved.rev,
			};
		}

		return staleOver(baseRev, saved.rev);
	});

function staleOver(baseRev: number, won: number): BoardReplaced {
	console.info(`[tasks] an installed app wrote over rev ${baseRev}; rev ${won} won: stale`);
	return {
		ok: false,
		why: "stale",
		rev: won,
	};
}
