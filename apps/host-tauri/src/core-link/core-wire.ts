import { z } from "zod";
import { InvalidationSchema } from "@widgetarium/framework";

export const CORE_CALL = "plugin:studio-core|call";
export const CORE_SERVE = "plugin:studio-core|serve";
export const CORE_ANSWER = "plugin:studio-core|answer";
export const CORE_CHANGED = "plugin:studio-core|changed";
export const CORE_CHANGED_EVENT = "studio-core-changed";
export const CORE_SERVING_EVENT = "studio-core-serving";
export const CORE_RESTARTED = "The core window restarted before it answered; the call may or may not have run.";
export const CORE_LIVE_WINDOWS = "plugin:studio-core|live_windows";
export const CORE_WINDOW_CLOSED_EVENT = "studio-core-window-closed";

export const LiveWindowsSchema = z.array(z.string());

export const CoreCallSchema = z.object({
	workspace: z.string(),
	name: z.string(),
	input: z.unknown().optional(),
	idempotencyKey: z.string().nullable(),
	headers: z.record(z.string(), z.string()).optional(),
});

export type CoreCall = z.infer<typeof CoreCallSchema>;

export const CoreAskSchema = z.object({
	id: z.number(),
	call: CoreCallSchema,
});

export const CoreChangeSchema = z.object({
	workspace: z.string(),
	invalidated: z.array(InvalidationSchema),
});
