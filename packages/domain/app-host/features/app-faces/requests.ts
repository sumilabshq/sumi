import { query, subscriber } from "@widgetarium/core/requests";
import { InstalledAppsChangedEvent } from "@widgetarium/app-installer";
import { AppFacesSchema, KnownAppsSchema } from "../../shared/schema/app-tab.schema.js";
import { readAppFaces, readKnownApps } from "../../shared/lib/apps/known-apps.js";

export const AppFacesQuery = query("app-faces")
	.output(AppFacesSchema)
	.handle((_input, { send }) => readAppFaces(send));

export const KnownAppsQuery = query("known-apps")
	.output(KnownAppsSchema)
	.handle(async (_input, { send }) => ({ apps: await readKnownApps(send) }));

export const RereadAppFacesSubscriber = subscriber(InstalledAppsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AppFacesQuery);
	invalidate(KnownAppsQuery);
});
