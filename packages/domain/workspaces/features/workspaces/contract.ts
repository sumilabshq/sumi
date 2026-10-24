import { z } from "zod";
import { PerCall, Repeatable, command, query } from "@widgetarium/core/requests";
import { WorkspaceIconSchema, WorkspacesSchema } from "../../shared/schema/workspace.schema.js";

const WorkspaceIdSchema = z.object({ id: z.string().min(1) });

export const WorkspacesQuery = query("workspaces/workspaces").output(WorkspacesSchema).settlesNow();

export const OpenWorkspaceCommand = command("workspaces/open-workspace")
	.input(WorkspaceIdSchema)
	.idempotencyKey(Repeatable)
	.invalidates([WorkspacesQuery]);

export const OpenWorkspaceByPositionCommand = command("workspaces/open-workspace-by-position")
	.input(z.object({ position: z.number().int().nonnegative() }))
	.idempotencyKey(Repeatable)
	.invalidates([WorkspacesQuery]);

export const CreateWorkspaceCommand = command("workspaces/create-workspace")
	.idempotencyKey(PerCall)
	.invalidates([WorkspacesQuery]);

export const RenameWorkspaceCommand = command("workspaces/rename-workspace")
	.input(WorkspaceIdSchema.extend({ name: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates([WorkspacesQuery]);

export const SetWorkspaceIconCommand = command("workspaces/set-workspace-icon")
	.input(WorkspaceIdSchema.extend({ icon: WorkspaceIconSchema.nullable() }))
	.idempotencyKey(Repeatable)
	.invalidates([WorkspacesQuery]);
