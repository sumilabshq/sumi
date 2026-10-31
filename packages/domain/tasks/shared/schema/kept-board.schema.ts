import { z } from "zod";
import { BoardSchema } from "./task.schema.js";

export const TASKS_DOC_KEY = "tasks";

export const MOST_BOARD_BYTES = 16 * 1024 * 1024;

const KeptRevSchema = z.number().int().nonnegative();

export const KeptBoardSchema = z.object({
	board: BoardSchema,
	rev: KeptRevSchema,
});

export const BoardReplaceSchema = z.object({
	board: BoardSchema,
	baseRev: KeptRevSchema,
});

export const BoardReplacedSchema = z.discriminatedUnion("ok", [
	z.object({
		ok: z.literal(true),
		rev: KeptRevSchema,
	}),
	z.object({
		ok: z.literal(false),
		why: z.literal("stale"),
		rev: KeptRevSchema,
	}),
]);

export type BoardReplaced = z.infer<typeof BoardReplacedSchema>;
