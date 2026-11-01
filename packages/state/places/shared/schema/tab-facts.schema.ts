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

export const OwnAppTabAskSchema = z.object({ id: z.string().min(1) });

export const OwnAppTabSchema = z.object({
	id: z.string(),
	app: z.string(),
	address: z.string().nullable(),
	title: z.string().nullable(),
	chatId: z.string().nullable(),
});

export const NamedRecordSchema = z.object({
	id: z.string().min(1),
	title: z.string().nullable(),
});

export type NamedRecord = z.infer<typeof NamedRecordSchema>;

export const KeepChatTabsAskSchema = z.object({ chats: z.array(NamedRecordSchema) });

export const AppPageSchema = z.object({
	id: z.string().min(1),
	address: z.string().max(2048).optional(),
	title: z.string().max(200).optional(),
	favicon: z
		.union([
			z
				.string()
				.max(65_536)
				.regex(/^data:image\//),
			z
				.string()
				.max(2048)
				.regex(/^sumi-app:\/\/[a-z][a-z0-9-]*\//),
		])
		.optional(),
});

export type AppPage = z.infer<typeof AppPageSchema>;
