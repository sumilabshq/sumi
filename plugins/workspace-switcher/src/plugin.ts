import { controlMenu } from "@sumi/control-menu-plugin";
import { shell } from "@sumi/sumi-host-plugin";
import { tabStrip } from "@sumi/tab-strip-plugin";
import { tabsSidebar } from "@sumi/tabs-sidebar-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { GroupWorkspaceMove } from "./features/workspace-moves/ui/group-workspace-move/group-workspace-move.js";
import { TabWorkspaceMove } from "./features/workspace-moves/ui/tab-workspace-move/tab-workspace-move.js";
import { WorkspaceControlRow } from "./features/workspace-switcher/ui/workspace-control-row/workspace-control-row.js";
import { WorkspaceKeys } from "./features/workspace-switcher/ui/workspace-keys/workspace-keys.js";
import { workspaceStripAt } from "./features/workspace-switcher/ui/workspace-strip/workspace-strip.js";
import metadata from "../metadata.json" with { type: "json" };

export const workspaceSwitcher = plugin("workspace-switcher")
	.describe(metadata)
	.require(shell, controlMenu)
	.optional(tabStrip, tabsSidebar)
	.apply((app) => {
		app.use(shell).layer(WorkspaceKeys);
		app.use(controlMenu).slots.top.add(WorkspaceControlRow);
		app.use(tabStrip)?.slots.start.add(workspaceStripAt("header"));
		app.use(tabStrip)?.slots.tabMoveItems.add(TabWorkspaceMove);
		app.use(tabStrip)?.slots.groupMenuItems.add(GroupWorkspaceMove);
		app.use(tabsSidebar)?.slots.foot.add(workspaceStripAt("sidebar"));
	});
