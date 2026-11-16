import { z } from "zod";

export const PaneSideSchema = z.enum(["right", "bottom"]);

export const SetupPaneSchema = z.object({
	app: z.string().min(1),
	title: z.string(),
	side: PaneSideSchema,
	besideAt: z.number().int().nonnegative(),
});

export type SetupPane = z.infer<typeof SetupPaneSchema>;

export const SetupSchema = z.object({
	id: z.string().min(1),
	title: z.string(),
	panes: z.array(SetupPaneSchema).readonly(),
});

export type Setup = z.infer<typeof SetupSchema>;

export const SetupsSchema = z.object({
	setups: z.array(SetupSchema).readonly(),
});

export const SetupOpeningSchema = z.object({
	id: z.string().min(1),
	homeTabId: z.string().min(1),
});
