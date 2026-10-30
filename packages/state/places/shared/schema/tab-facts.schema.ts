import { z } from "zod";
import { TabMarkSchema } from "./tabs.schema.js";

export const TabTurnSchema = z.object({
	id: z.string().min(1),
	title: z.string().nullable(),
	isBusy: z.boolean(),
	isSeen: z.boolean(),
});

export type TabTurn = z.infer<typeof TabTurnSchema>;

export const TabTurnMarksSchema = z.object({
	was: TabMarkSchema.nullable(),
	mark: TabMarkSchema.nullable(),
});

export const SeenTabSchema = z.object({ id: z.string().min(1) });

export const NamedRecordSchema = z.object({
	id: z.string().min(1),
	title: z.string().nullable(),
});

export type NamedRecord = z.infer<typeof NamedRecordSchema>;

export const KeepChatTabsAskSchema = z.object({ chats: z.array(NamedRecordSchema) });
