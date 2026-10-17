import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { AppTabsSchema } from "../../shared/schema/app-tab.schema.js";

export const AppTabsQuery = query("app-host/app-tabs").output(AppTabsSchema).settlesNow();

export const ShowAppCommand = command("app-host/show-app")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);
