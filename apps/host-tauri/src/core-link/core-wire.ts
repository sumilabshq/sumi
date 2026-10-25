import { z } from "zod";
import { InvalidationSchema } from "@widgetarium/core/requests";

export const CORE_CALL = "plugin:studio-core|call";
export const CORE_SERVE = "plugin:studio-core|serve";
export const CORE_ANSWER = "plugin:studio-core|answer";
export const CORE_CHANGED = "plugin:studio-core|changed";
export const CORE_CHANGED_EVENT = "studio-core-changed";
export const CORE_LIVE_WINDOWS = "plugin:studio-core|live_windows";
export const CORE_WINDOW_CLOSED_EVENT = "studio-core-window-closed";

export const LiveWindowsSchema = z.array(z.string());

export const CoreCallSchema = z.object({
	workspace: z.string(),
	name: z.string(),
	input: z.unknown().optional(),
	idempotencyKey: z.string().nullable(),
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
