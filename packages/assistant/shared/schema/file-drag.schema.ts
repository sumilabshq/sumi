import { z } from "zod";

export const FileDragSchema = z.object({
	isOver: z.boolean(),
	dropped: z.string().nullable(),
});

export const PageDragAskedSchema = z.object({ drag: z.enum(["enter", "leave", "drop"]) });

export const DroppedAskedSchema = z.object({ id: z.string() });
