import { z } from "zod";
import { AttachmentChipSchema } from "./attachment.schema.js";

export const TallySchema = z.object({
	passed: z.number(),
	all: z.number(),
});

export const BlockerSchema = z.object({
	feature: z.string(),
	why: z.string(),
});

export const CallOutputCountsSchema = z.object({
	lines: z.number().optional(),
	hits: z.number().optional(),
	features: TallySchema.optional(),
	blockedBy: BlockerSchema.optional(),
});

export const AssistantCallSchema = z.object({
	ref: z.string(),
	name: z.string(),
	input: z.record(z.string(), z.unknown()),
	output: z.string(),
	answered: z.boolean(),
	failed: z.boolean(),
	at: z.number(),
	answeredAt: z.number().optional(),
	textOffset: z.number().optional(),
	outputCounts: CallOutputCountsSchema.optional(),
});

export const AssistantTurnSchema = z.object({
	role: z.enum(["user", "agent", "compact"]),
	text: z.string(),
	calls: z.array(AssistantCallSchema),
	startedAt: z.number().optional(),
	endedAt: z.number().optional(),
	outcome: z.enum(["done", "stopped", "failed"]).optional(),
});

export const AssistantSessionSchema = z.object({
	turns: z.array(AssistantTurnSchema).readonly(),
	busy: z.boolean(),
	failure: z.string().nullable(),
	tool: z.string().nullable(),
	phase: z.enum(["thinking", "tools", "writing"]).nullable(),
	spent: z.number(),
});

export const DiffLineSchema = z.object({
	sign: z.enum(["added", "removed", "kept"]),
	text: z.string(),
});

export const CallChangeSchema = z.object({
	file: z.string(),
	added: z.number(),
	removed: z.number(),
	lines: z.array(DiffLineSchema).readonly(),
});

export const CallMetaSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("count"),
		said: z.string(),
	}),
	z.object({
		kind: z.literal("change"),
		added: z.number(),
		removed: z.number(),
	}),
	z.object({
		kind: z.literal("verdict"),
		passed: z.boolean(),
	}),
]);

export const CallFaceSchema = z.object({
	kind: z.enum(["search", "read", "edit", "run", "other"]),
	glyph: z.string(),
	verb: z.string(),
	doing: z.string(),
	object: z.string(),
	isCodeObject: z.boolean(),
	meta: CallMetaSchema.nullable(),
	change: CallChangeSchema.nullable(),
});

const SaidStepSchema = z.object({
	kind: z.literal("said"),
	text: z.string(),
});

const ToolsStepSchema = z.object({
	kind: z.literal("tools"),
	calls: z.array(AssistantCallSchema),
	faces: z.array(CallFaceSchema),
});

export const TurnStepSchema = z.discriminatedUnion("kind", [SaidStepSchema, ToolsStepSchema]);

export type TurnStep = z.infer<typeof TurnStepSchema>;

export const ShownTurnSchema = z.object({
	turn: AssistantTurnSchema,
	steps: z.array(TurnStepSchema),
	attached: z.array(AttachmentChipSchema),
});

export type ShownTurn = z.infer<typeof ShownTurnSchema>;

export const ChatSchema = z.object({
	isAvailable: z.boolean(),
	session: AssistantSessionSchema,
	turns: z.array(ShownTurnSchema),
	runningCall: AssistantCallSchema.nullable(),
	runningFace: CallFaceSchema.nullable(),
	isAsking: z.boolean(),
});

export type Chat = z.infer<typeof ChatSchema>;
