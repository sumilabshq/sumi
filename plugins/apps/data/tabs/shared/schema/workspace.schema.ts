import { z } from "zod";
import { GroupColourSchema } from "./place.schema.js";

export const NoInputSchema = z.strictObject({});

export const ChatMarkSchema = z.enum(["none", "running", "asking", "failed", "unread"]);

export const StateTabSchema = z.object({
	id: z.string(),
	title: z.string(),
	app: z.string(),
	address: z.string().nullable(),
	isShown: z.boolean(),
	isInOwnWindow: z.boolean(),
	status: z.enum(["reading", "waiting", "cannot-look"]).nullable(),
});

export const StatePageSchema = StateTabSchema.extend({
	subPages: z.array(StateTabSchema),
});

export const StateGroupSchema = z.object({
	kind: z.literal("group"),
	id: z.string(),
	name: z.string(),
	colour: GroupColourSchema.nullable(),
	isOpen: z.boolean(),
	tabs: z.array(StatePageSchema),
});

export const StateEntrySchema = z.discriminatedUnion("kind", [
	StatePageSchema.extend({ kind: z.literal("tab") }),
	StateGroupSchema,
]);

export const WorkspaceStateSchema = z.object({
	thisChat: z.string(),
	chats: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			isThisChat: z.boolean(),
		}),
	),
	shownTab: z.string().nullable(),
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
