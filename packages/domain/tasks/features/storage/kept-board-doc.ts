import type { AnswerResult } from "@sumi/contract";
import type { Answer, StartedApp } from "@widgetarium/core/requests";
import { z } from "zod";
import { KeptBoardQuery, ReplaceKeptBoardCommand } from "../../generated/contract.js";
import { BoardReplaceSchema } from "../../shared/schema/kept-board.schema.js";

const NOT_A_BOARD = 'The "tasks" document is not a board: {issues}';

export interface AppDoc {
	readonly read: () => Promise<AnswerResult>;
	readonly write: (doc: unknown, baseRev: number) => Promise<AnswerResult>;
}

const ANSWERED_BY_APP: ReadonlySet<string> = new Set(["refused", "invalid-input", "rate-limited"]);

export function keptBoardDocOf(send: StartedApp["send"]): AppDoc {
	return {
		read: async () => {
			const kept = await send(KeptBoardQuery);
			return kept.ok
				? answered({
						doc: kept.output.board,
						rev: kept.output.rev,
					})
				: refusedOrThrown(kept);
		},
		write: async (doc, baseRev) => {
			const replace = BoardReplaceSchema.safeParse({
				board: doc,
				baseRev,
			});

			if (!replace.success) {
				return {
					ok: false,
					reason: NOT_A_BOARD.replace("{issues}", z.prettifyError(replace.error)),
				};
			}

			const written = await send(ReplaceKeptBoardCommand, replace.data);
			return written.ok ? answered(written.output) : refusedOrThrown(written);
		},
	};
}

function answered(output: unknown): AnswerResult {
	return {
		ok: true,
		output,
	};
}

function refusedOrThrown(refusal: Extract<Answer<unknown>, { readonly ok: false }>): AnswerResult {
	if (!ANSWERED_BY_APP.has(refusal.code)) {
		throw new Error(`${refusal.code}: ${refusal.reason}`);
	}

	return {
		ok: false,
		reason: refusal.reason,
	};
}
