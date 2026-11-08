import { query } from "#module";
import { apps } from "@sumi/apps/contract";
import { OpenableAppsSchema } from "../../shared/schema/workspace.schema.js";
import { openableAppsOf } from "../../shared/lib/openable-apps.js";

export const all = query()
	.public()
	.metadata({
		description: "List the apps a tab can open: each id is what tabs_tab_open takes as app.",
	})
	.output(OpenableAppsSchema)
	.handle(async (_input, { send }) => ({
		apps: openableAppsOf((await send(apps.apps.all)).apps).map(({ id, title }) => ({ id, title })),
	}));
