import { z } from "zod";

export const FilePathSchema = z.string().min(1).max(4096);

export const PathInputSchema = z.object({
	path: FilePathSchema,
});

export type PathInput = z.infer<typeof PathInputSchema>;

export const FileContentSchema = z.string();

export const WriteFileInputSchema = z.object({
	path: FilePathSchema,
	content: z.string().max(16777216),
});

export type WriteFileInput = z.infer<typeof WriteFileInputSchema>;

export const MoveInputSchema = z.object({
	from: FilePathSchema,
	to: FilePathSchema,
});

export type MoveInput = z.infer<typeof MoveInputSchema>;

export const EntryKindSchema = z.enum(["file", "folder"]);

export const FolderEntrySchema = z.object({
	name: z.string(),
	kind: EntryKindSchema,
});

export type FolderEntry = z.infer<typeof FolderEntrySchema>;

export const FolderSchema = z.object({
	entries: z.array(FolderEntrySchema),
});

export type Folder = z.infer<typeof FolderSchema>;

export const FileInfoSchema = z.object({
	exists: z.boolean(),
	kind: EntryKindSchema.nullable(),
	size: z.number().nullable(),
	modifiedMs: z.number().nullable(),
});

export type FileInfo = z.infer<typeof FileInfoSchema>;
