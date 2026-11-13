import { z } from "zod";
import { ChatKeySchema } from "./chat-key.schema.js";

export const FileDragSchema = z.object({
	isOver: z.boolean(),
	dropped: z.string().nullable(),
});

export type FileDrag = z.infer<typeof FileDragSchema>;

export const PageDragSchema = z.enum(["enter", "leave", "drop"]);

export type PageDrag = z.infer<typeof PageDragSchema>;

export const PageDragAskedSchema = ChatKeySchema.extend({
	drag: PageDragSchema,
});

export const DroppedAskedSchema = ChatKeySchema.extend({
	id: z.string(),
});

export const DroppedFileSchema = z.object({
	name: z.string(),
	size: z.number(),
	file: z.custom<() => Promise<File>>(),
});

export type DroppedFile = z.infer<typeof DroppedFileSchema>;

export const FileDragEventSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.enum(["enter", "over", "leave"]),
	}),
	z.object({
		kind: z.literal("drop"),
		files: z.array(DroppedFileSchema).readonly(),
		folders: z.array(z.string()).readonly(),
	}),
]);

export type FileDragEvent = z.infer<typeof FileDragEventSchema>;

export const ChatFileDragEventSchema = ChatKeySchema.extend({
	drag: FileDragEventSchema,
});
