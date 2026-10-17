import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { ColumnSideSchema, TabsColumnSchema } from "../../shared/schema/tabs-column.schema.js";

export const TabsColumnQuery = query("app-host/tabs-column").output(TabsColumnSchema).settlesNow();

export const ToggleColumnCommand = command("app-host/toggle-column")
	.idempotencyKey(Repeatable)
	.invalidates([TabsColumnQuery]);

export const ResizeColumnCommand = command("app-host/resize-column")
	.input(z.object({ px: z.number() }))
	.idempotencyKey(Repeatable)
	.invalidates([TabsColumnQuery]);

export const MoveColumnCommand = command("app-host/move-column")
	.input(z.object({ side: ColumnSideSchema }))
	.idempotencyKey(Repeatable)
	.invalidates([TabsColumnQuery]);

export const ShowColumnIconsCommand = command("app-host/show-column-icons")
	.idempotencyKey(Repeatable)
	.invalidates([TabsColumnQuery]);
