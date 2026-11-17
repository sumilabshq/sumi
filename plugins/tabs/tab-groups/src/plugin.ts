import { groups as groupsModule } from "@sumi/groups/implementation";
import { navigation } from "@sumi/navigation-plugin";
import { backend, windows } from "@sumi/sumi-host-plugin";
import { tabGroups as tabGroupsContract } from "@sumi/tab-groups/contract";
import { tabGroups as tabGroupsModule } from "@sumi/tab-groups/implementation";
import { tabStrip } from "@sumi/tab-strip-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { GroupEditor } from "./features/group-menu/ui/group-editor/group-editor.js";
import { GroupMenuItems } from "./features/group-menu/ui/group-menu-items/group-menu-items.js";
import { NewGroupItem } from "./features/group-menu/ui/new-group-item/new-group-item.js";

export const tabGroups = plugin("tab-groups")
	.require(backend, windows, navigation, tabStrip)
	.apply((app) => {
		const { placedApps } = app.use(navigation);
		app.use(backend).moduleOf(({ store }) => tabGroupsModule({ store, apps: placedApps }), tabGroupsContract);
		app.use(windows).moduleOf(() => groupsModule);
		app.use(tabStrip).slots.tabMenuItems.add(GroupMenuItems);
		app.use(tabStrip).slots.listMenuItems.add(NewGroupItem);
		app.use(tabStrip).slots.groupMenuItems.add(GroupEditor);
	});
