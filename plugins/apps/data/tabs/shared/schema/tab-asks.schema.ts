import { z } from "zod";
import { GroupingSchema } from "./place.schema.js";

export const TabOpenSchema = GroupingSchema.extend({
	app: z.string().min(1).describe("The app to open the tab in: an id from tabs_apps_all."),
	target: z
		.string()
		.min(1)
		.optional()
		.describe(
			"The place inside app: a task id such as T-12 for tasks, an address or search words for browser. Leave it out for the app's home.",
		),
});

export type TabOpen = z.output<typeof TabOpenSchema>;

export const TabDuplicateSchema = GroupingSchema.extend({
	tabId: z.string().min(1),
});

export type TabDuplicate = z.output<typeof TabDuplicateSchema>;

export const TabUpdateSchema = z.strictObject({
	tabId: z.string().min(1),
	title: z.string().optional(),
	place: z
		.enum(["this-chat", "workspace"])
		.optional()
		.describe(
			"this-chat or workspace (the Recents section). Other chats' lists are read and copied from, never written.",
		),
	group: z.string().min(1).nullable().optional().describe("A group id, or null to take it out of its group."),
	before: z.string().min(1).nullable().optional().describe("Id of the tab it should stand before; null for the end."),
});

export type TabUpdate = z.output<typeof TabUpdateSchema>;

export const TabIdSchema = z.strictObject({
	tabId: z.string().min(1),
});

export const PlacedTabSchema = z.object({
	id: z.string(),
	place: z.string(),
	isShown: z.boolean(),
});

export type PlacedTab = z.output<typeof PlacedTabSchema>;

export const TabNowSchema = z.object({
	id: z.string(),
	title: z.string(),
	address: z.string().nullable(),
	place: z.string(),
	groupId: z.string().nullable(),
});

export type TabNow = z.output<typeof TabNowSchema>;

export const ClosedTabSchema = z.object({
	closed: z.string(),
});
