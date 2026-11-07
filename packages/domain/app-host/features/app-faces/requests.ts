import { query } from "#module";
import { AppFacesSchema, KnownAppsSchema } from "../../shared/schema/app-tab.schema.js";
import { readAppFaces, readKnownApps } from "../../shared/lib/apps/known-apps.js";

export const AppFacesQuery = query("app-faces")
	.public()
	.output(AppFacesSchema)
	.handle((_input, { send }) => readAppFaces(send));

export const KnownAppsQuery = query("known-apps")
	.public()
	.output(KnownAppsSchema)
	.handle(async (_input, { send }) => ({ apps: await readKnownApps(send) }));
