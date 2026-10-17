import { z } from "zod";

export const ColumnLookSchema = z.enum(["hidden", "icons", "full"]);

export type ColumnLook = z.infer<typeof ColumnLookSchema>;

export const ColumnSideSchema = z.enum(["start", "end"]);

export type ColumnSide = z.infer<typeof ColumnSideSchema>;

export const KeptColumnSchema = z.object({
	isShown: z.boolean(),
	isFull: z.boolean(),
	fullPx: z.number(),
	side: ColumnSideSchema,
});

export type KeptColumn = z.infer<typeof KeptColumnSchema>;

export const TabsColumnSchema = z.object({
	look: ColumnLookSchema,
	widthPx: z.number(),
	side: ColumnSideSchema,
});

export type TabsColumn = z.infer<typeof TabsColumnSchema>;
