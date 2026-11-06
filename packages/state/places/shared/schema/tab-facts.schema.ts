import { z } from "zod";
import { AppActionSchema, AskedLinkSchema, TabMarkSchema } from "./tabs.schema.js";

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
	canGoBack: z.boolean().optional(),
	canGoForward: z.boolean().optional(),
	actions: z.array(AppActionSchema).optional(),
	presses: z
		.array(
			z.object({
				id: z.string(),
				action: z.string(),
			}),
		)
		.optional(),
});

export type OwnAppTab = z.infer<typeof OwnAppTabSchema>;

export const PressAppActionSchema = z.object({
	tab: z.string().min(1),
	action: z.string().min(1),
});

export type PressAppAction = z.infer<typeof PressAppActionSchema>;

export const TakeActionPressSchema = z.object({
	id: z.string().min(1),
	press: z.string().min(1),
});

export type TakeActionPress = z.infer<typeof TakeActionPressSchema>;

export const TakenPressSchema = z.object({
	id: z.string(),
	action: z.string(),
});

export const TabStepSchema = z.object({ id: z.string().min(1) });

export const LinkAskSchema = z.object({
	from: z.string().min(1),
	href: z.string().min(1).max(2048),
	inNewTab: z.boolean().default(false),
});

export type LinkAsk = z.infer<typeof LinkAskSchema>;

export const LinkFollowedSchema = z.object({
	kind: z.enum(["navigated", "asked"]),
});

export const AskedLinksAskSchema = z.object({ tabIds: z.array(z.string()) });

export const AskedLinksSchema = z.object({
	links: z.array(AskedLinkSchema),
});

export const TakeAskedLinkSchema = z.object({ id: z.string().min(1) });

export const NamedRecordSchema = z.object({
	id: z.string().min(1),
	title: z.string().nullable(),
});

export type NamedRecord = z.infer<typeof NamedRecordSchema>;

export const KeepChatTabsAskSchema = z.object({ chats: z.array(NamedRecordSchema) });

export const AppPageSchema = z.object({
	id: z.string().min(1),
	address: z.string().max(2048).optional(),
	how: z.enum(["push", "replace"]).optional(),
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
	actions: z.array(AppActionSchema).max(6).optional(),
});

export type AppPage = z.infer<typeof AppPageSchema>;
