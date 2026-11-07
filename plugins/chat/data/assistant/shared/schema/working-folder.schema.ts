import { z } from "zod";

export const WorkingFoldersSchema = z.object({
	workspace: z.string(),
	current: z.string().nullable(),
	recent: z.array(z.string()),
});

export type WorkingFolders = z.infer<typeof WorkingFoldersSchema>;

export const FolderAskedSchema = z.object({ path: z.string().min(1) });
