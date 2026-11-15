import { z } from "zod";
import { GroupColourSchema } from "./place.schema.js";

export const NoInputSchema = z.strictObject({});

export const ChatMarkSchema = z.enum(["none", "running", "unread"]);

export const StateTabSchema = z.object({
	id: z.string(),
	title: z.string(),
	app: z.string(),
	address: z.string().nullable(),
	isShown: z.boolean(),
	isInOwnWindow: z.boolean(),
	status: z.enum(["reading", "waiting", "cannot-look"]).nullable(),
});

export const StateChatSchema = z.object({
	kind: z.literal("chat"),
	id: z.string(),
	title: z.string(),
	mark: ChatMarkSchema,
});

export const StateGroupSchema = z.object({
	kind: z.literal("group"),
	id: z.string(),
	name: z.string(),
	colour: GroupColourSchema.nullable(),
	isOpen: z.boolean(),
	tabs: z.array(StateTabSchema),
	chats: z.array(StateChatSchema),
});

export const StateEntrySchema = z.discriminatedUnion("kind", [
	StateTabSchema.extend({ kind: z.literal("tab") }),
	StateChatSchema,
	StateGroupSchema,
]);

export const WorkspaceStateSchema = z.object({
	thisChat: z.string(),
	chats: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			isThisChat: z.boolean(),
			isPinned: z.boolean(),
		}),
	),
	shownTab: z.string().nullable(),
	essentials: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			isShown: z.boolean(),
		}),
	),
	sections: z.array(
		z.object({
			list: z.string(),
			title: z.string(),
			entries: z.array(StateEntrySchema),
		}),
	),
});

export type WorkspaceState = z.infer<typeof WorkspaceStateSchema>;

export const OpenableAppsSchema = z.object({
	apps: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
		}),
	),
});
