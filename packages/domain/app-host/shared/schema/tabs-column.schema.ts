import { z } from "zod";

export const ColumnSideSchema = z.enum(["start", "end"]);

export type ColumnSide = z.infer<typeof ColumnSideSchema>;

export const SidebarViewSchema = z.object({
	hidesEmptyLists: z.boolean(),
	hidesOwnWindowTabs: z.boolean(),
});

export type SidebarView = z.infer<typeof SidebarViewSchema>;

export const KeptColumnSchema = z.object({
	hidesEmptyLists: z.boolean().default(false),
	hidesOwnWindowTabs: z.boolean().default(false),
	fullPx: z.number(),
	side: ColumnSideSchema,
	shutLists: z.array(z.string()).default([]),
});

export type KeptColumn = z.infer<typeof KeptColumnSchema>;

export const TabsColumnSchema = z.object({
	widthPx: z.number(),
	side: ColumnSideSchema,
});

export type TabsColumn = z.infer<typeof TabsColumnSchema>;
