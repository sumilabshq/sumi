import { z } from "zod";
import { ChatKeySchema } from "./chat-key.schema.js";

export const PermissionModeSchema = z.enum(["manual", "acceptEdits", "plan", "auto"]);

export type PermissionMode = z.infer<typeof PermissionModeSchema>;

export const ClaudeModelSchema = z.enum(["opus", "sonnet", "haiku", "fable"]);

export type ClaudeModel = z.infer<typeof ClaudeModelSchema>;

export const ClaudeEffortSchema = z.enum(["low", "medium", "high", "xhigh", "max"]);

export type ClaudeEffort = z.infer<typeof ClaudeEffortSchema>;

export const UsageWindowSchema = z.object({
	used: z.number().nonnegative(),
	resetsAt: z.number().int().nonnegative(),
});

export const PlanUsageSchema = z.object({
	fiveHour: UsageWindowSchema.nullable(),
	week: UsageWindowSchema.nullable(),
});

export type PlanUsage = z.infer<typeof PlanUsageSchema>;

export const ClaudeOptionsSchema = z.object({
	mode: PermissionModeSchema,
	model: ClaudeModelSchema,
	effort: ClaudeEffortSchema,
	usage: PlanUsageSchema.nullable(),
});

export type ClaudeOptions = z.infer<typeof ClaudeOptionsSchema>;

export const ClaudeOptionAskedSchema = z.union([
	z.object({ mode: PermissionModeSchema }),
	z.object({ model: ClaudeModelSchema }),
	z.object({ effort: ClaudeEffortSchema }),
]);

export type ClaudeOptionAsked = z.infer<typeof ClaudeOptionAskedSchema>;

export const ClaudeOptionInChatSchema = ChatKeySchema.extend({
	option: ClaudeOptionAskedSchema,
});

export const ClaudeModelAskedSchema = ChatKeySchema.extend({
	model: ClaudeModelSchema,
});
