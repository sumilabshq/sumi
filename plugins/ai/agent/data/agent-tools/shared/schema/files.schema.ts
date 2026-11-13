import { z } from "zod";

export const FilePathSchema = z.string().min(1).max(4096).describe("Absolute path of the file");

export const FolderPathSchema = z.string().min(1).max(4096).startsWith("/").describe("Absolute path of the folder");

export const TextAskedSchema = z.object({
	path: FilePathSchema,
	offset: z.number().int().min(1).optional().describe("First line to read, counted from 1"),
	limit: z.number().int().min(1).max(5000).optional().describe("How many lines to read, 2000 when omitted"),
});

export const FileTextSchema = z.object({
	lines: z.array(z.string()),
	shown: z.string(),
});

export type FileText = z.infer<typeof FileTextSchema>;

export const WriteAskedSchema = z.object({
	path: FilePathSchema,
	content: z.string().max(16777216),
});

export const WrittenSchema = z.object({
	path: z.string(),
	lines: z.number().int(),
});

export const EditAskedSchema = z.object({
	path: FilePathSchema,
	oldText: z.string().min(1).describe("Text that is in the file now, exactly, with its indentation"),
	newText: z.string().describe("Text to put in its place"),
	replaceAll: z.boolean().optional().describe("Replace every occurrence; otherwise oldText must occur once"),
});

export const EditedSchema = z.object({
	path: z.string(),
	replaced: z.number().int(),
});

export const PathsAskedSchema = z.object({
	folder: FolderPathSchema,
	pattern: z.string().min(1).max(1000).describe('Glob relative to the folder, such as "**/*.ts" or "src/**/use-*.tsx"'),
});

export const PathsSchema = z.object({
	paths: z.array(z.string()),
	isCut: z.boolean(),
});

export const MatchesAskedSchema = z.object({
	folder: FolderPathSchema,
	pattern: z.string().min(1).max(1000).describe("Extended regular expression"),
	files: z.string().min(1).max(200).optional().describe('Only files whose name matches this glob, such as "*.ts"'),
	ignoreCase: z.boolean().optional(),
});

export const MatchesSchema = z.object({
	lines: z.array(z.string()),
	isCut: z.boolean(),
});

export const ImageAskedSchema = z.object({
	path: FilePathSchema.describe("Absolute path of a PNG image"),
});

export const ImageSchema = z.object({
	png: z.string(),
	path: z.string(),
});
