import { groups as groupsModule } from "@sumi/groups/implementation";
import { navigation } from "@sumi/navigation-plugin";
import { backend, windows } from "@sumi/sumi-host-plugin";
import { tabGroups as tabGroupsContract } from "@sumi/tab-groups/contract";
import { tabGroups as tabGroupsModule } from "@sumi/tab-groups/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };

export const tabGroups = plugin("tab-groups")
	.describe(metadata)
	.require(backend, windows, navigation)
	.apply((app) => {
		const { placedApps } = app.use(navigation);
		app.use(backend).moduleOf(({ store }) => tabGroupsModule({ store, apps: placedApps }), tabGroupsContract);
		app.use(windows).moduleOf(() => groupsModule);
	});
