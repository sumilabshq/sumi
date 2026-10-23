import { z } from "zod";
import { Repeatable, command } from "@widgetarium/core/requests";
import { GroupHueSchema } from "../../shared/schema/tab-group.schema.js";

const GroupIdSchema = z.object({ id: z.string() });

export const CreateGroupCommand = command("app-host/create-group")
	.input(z.object({ withTabId: z.string().nullable() }))
	.output(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable);

export const RenameGroupCommand = command("app-host/rename-group")
	.input(GroupIdSchema.extend({ name: z.string() }))
	.idempotencyKey(Repeatable);

export const SetGroupHueCommand = command("app-host/set-group-hue")
	.input(GroupIdSchema.extend({ hue: GroupHueSchema.nullable() }))
	.idempotencyKey(Repeatable);

export const FoldGroupCommand = command("app-host/fold-group").input(GroupIdSchema).idempotencyKey(Repeatable);

export const UngroupCommand = command("app-host/ungroup").input(GroupIdSchema).idempotencyKey(Repeatable);

export const CloseGroupCommand = command("app-host/close-group").input(GroupIdSchema).idempotencyKey(Repeatable);
