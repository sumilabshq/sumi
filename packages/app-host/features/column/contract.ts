import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { TabsColumnSchema } from "../../shared/schema/tabs-column.schema.js";

export const TabsColumnQuery = query("app-host/tabs-column").output(TabsColumnSchema).settlesNow();

export const ResizeColumnCommand = command("app-host/resize-column")
	.input(z.object({ px: z.number() }))
	.idempotencyKey(Repeatable)
	.invalidates([TabsColumnQuery]);

export const FoldTabListCommand = command("app-host/fold-tab-list").idempotencyKey(Repeatable);
