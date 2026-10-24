import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { AccessLevelSchema, SiteAccessSchema } from "../../shared/schema/site-access.schema.js";

export const SiteAccessQuery = query("browser/site-access").output(SiteAccessSchema).settlesNow();

export const SetSiteLevelCommand = command("browser/set-site-level")
	.input(
		z.object({
			siteKey: z.string(),
			level: AccessLevelSchema,
		}),
	)
	.idempotencyKey(Repeatable)
	.invalidates([SiteAccessQuery]);
