import { z } from "zod";

export const AppActionSchema = z.object({
	id: z
		.string()
		.max(40)
		.regex(/^[a-z][a-z0-9-]*$/),
	label: z.string().min(1).max(60),
	icon: z
		.string()
		.max(40)
		.regex(/^[a-z][a-z0-9-]*$/),
	isOff: z.boolean().optional(),
	isBusy: z.boolean().optional(),
});

export type AppAction = z.infer<typeof AppActionSchema>;

export const PressSchema = z.object({
	id: z.string(),
	action: z.string(),
});

export type Press = z.infer<typeof PressSchema>;

export const AppPageAskSchema = z.object({
	id: z.string().min(1),
});

export const AppPageSchema = z.object({
	actions: z.array(AppActionSchema),
	presses: z.array(PressSchema),
});

export type AppPage = z.infer<typeof AppPageSchema>;

export const RecordedAppPageSchema = z.object({
	id: z.string().min(1),
	actions: z.array(AppActionSchema).max(6),
});

export type RecordedAppPage = z.infer<typeof RecordedAppPageSchema>;

export const PressAppActionSchema = z.object({
	tab: z.string().min(1),
	action: z.string().min(1),
});

export const TakeActionPressSchema = z.object({
	id: z.string().min(1),
	press: z.string().min(1),
});

export const TakenPressSchema = z.object({
	id: z.string(),
	action: z.string(),
});
