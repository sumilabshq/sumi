import { z } from "zod";
import { WorkspaceIconSchema } from "@widgetarium/workspaces";
import { HeldDoc } from "../store/held-doc.js";
import { validEntriesOf, validValuesOf } from "../store/valid-entries.js";
import { GLOBAL_ROOT } from "../store/store-client.js";
import type { DocKind, StoreClient } from "../store/store-client.js";

const WorkspaceLooksSchema = z.looseObject({
	order: z.array(z.string()).default([]),
	icons: z.record(z.string(), WorkspaceIconSchema).default({}),
});

export type WorkspaceLooks = z.infer<typeof WorkspaceLooksSchema>;

const WORKSPACE_LOOKS: DocKind<WorkspaceLooks> = {
	file: "workspace-looks.json",
	v: 1,
	schema: WorkspaceLooksSchema,
	salvage: WorkspaceLooksSchema.extend({
		order: validEntriesOf(z.string()),
		icons: validValuesOf(WorkspaceIconSchema),
	}),
};

export type HeldLooks = HeldDoc<WorkspaceLooks>;

export function readWorkspaceLooks(store: StoreClient): Promise<HeldLooks> {
	return HeldDoc.read({
		store,
		root: GLOBAL_ROOT,
		kind: WORKSPACE_LOOKS,
		empty: WorkspaceLooksSchema.parse({}),
	});
}
