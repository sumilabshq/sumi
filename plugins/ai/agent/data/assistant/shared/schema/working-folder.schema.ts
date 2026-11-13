import { z } from "zod";
import { ChatKeySchema } from "./chat-key.schema.js";

export const WorkingFoldersSchema = z.object({
	workspace: z.string(),
	current: z.string().nullable(),
	recent: z.array(z.string()),
});

export type WorkingFolders = z.infer<typeof WorkingFoldersSchema>;

export const FolderAskedSchema = ChatKeySchema.extend({ path: z.string().min(1) });
