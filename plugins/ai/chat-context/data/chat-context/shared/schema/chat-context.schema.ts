import { z } from "zod";

export const FINDER = "Finder";
export const FOUND_EDITORS = ["Zed", "Visual Studio Code", "Cursor"] as const;

export const EditorSchema = z.enum([...FOUND_EDITORS, FINDER]);

export type Editor = z.infer<typeof EditorSchema>;

export const FolderPathSchema = z.string().min(1).max(4096).startsWith("/");

export const FolderInputSchema = z.object({
	folder: FolderPathSchema,
});

export const OpenInInputSchema = z.object({
	folder: FolderPathSchema,
	editor: EditorSchema,
});

export const EnterInputSchema = z.object({
	session: z.string().min(1).max(200),
	folder: FolderPathSchema,
});

export const ChatContextSchema = z.object({
	folder: FolderPathSchema,
	name: z.string(),
	branch: z.string().nullable(),
	editors: z.array(EditorSchema),
	editor: EditorSchema,
});

export type ChatContext = z.infer<typeof ChatContextSchema>;
