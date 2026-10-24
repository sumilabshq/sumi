import { z } from "zod";

export const LookRowSchema = z.object({
	name: z.string(),
	label: z.string(),
	options: z.array(z.string()),
	picked: z.string(),
	isSegmented: z.boolean(),
	suggested: z.string().nullable(),
	isRedrawn: z.boolean(),
});

export const LookPanelSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("none") }),
	z.object({
		kind: z.literal("unreadable"),
		said: z.string(),
	}),
	z.object({
		kind: z.literal("look"),
		system: z.string(),
		sheet: z.string(),
		fontsUrl: z.string().nullable(),
		rows: z.array(LookRowSchema),
	}),
]);

export const LookPickSchema = z.object({
	settingName: z.string(),
	option: z.string(),
});

export type LookRow = z.output<typeof LookRowSchema>;
export type LookPanel = z.output<typeof LookPanelSchema>;
