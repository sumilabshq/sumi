import { z } from "zod";
import type { DocKind } from "../store/store-client.js";

export const WorkspaceEntrySchema = z.object({
	id: z.uuid(),
	name: z.string(),
	folder: z.string().nullable(),
	folderFound: z.boolean(),
	lastOpenedAt: z.number().int().nonnegative(),
	recentFolders: z.array(z.string()).catch([]),
});

export type WorkspaceEntry = z.infer<typeof WorkspaceEntrySchema>;

const WorkspacesSchema = z.looseObject({
	workspaces: z
		.array(
			z.object({
				id: z.uuid(),
				lastOpenedAt: z.number().int().nonnegative(),
			}),
		)
		.catch([]),
	lastOpenedId: z.string().nullable().catch(null),
});

export type Workspaces = z.infer<typeof WorkspacesSchema>;

export const WORKSPACES: DocKind<Workspaces> = {
	file: "workspaces.json",
	v: 1,
	schema: WorkspacesSchema,
};

export const WORKSPACE_FILE = "workspace.json";
