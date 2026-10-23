import { z } from "zod";

export const ColumnSideSchema = z.enum(["start", "end"]);

export type ColumnSide = z.infer<typeof ColumnSideSchema>;

export const KeptColumnSchema = z.object({
	fullPx: z.number(),
	side: ColumnSideSchema,
	isListOpen: z.boolean().default(true),
});

export type KeptColumn = z.infer<typeof KeptColumnSchema>;

export const TabsColumnSchema = z.object({
	widthPx: z.number(),
	side: ColumnSideSchema,
});

export type TabsColumn = z.infer<typeof TabsColumnSchema>;
