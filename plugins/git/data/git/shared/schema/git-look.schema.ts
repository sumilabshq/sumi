import { z } from "zod";

export const GitLookSchema = z.object({
	isWrapped: z.boolean(),
	isFileListShown: z.boolean(),
	fileListPx: z.number(),
	isFileTree: z.boolean(),
});

export type GitLook = z.infer<typeof GitLookSchema>;

export const FileListWidthInputSchema = z.object({
	px: z.number(),
});
