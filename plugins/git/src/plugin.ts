import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { GitModule } from "@sumi/git/module";
import { plugin } from "@widgetarium/plugin-framework";
import { gitTitleOf } from "./features/git-page/lib/git-address.js";
import { GIT_ICON } from "./features/git-page/lib/git-icon.js";
import { LazyGitView } from "./features/git-page/lib/lazy-git-view.js";
import { RereadAction } from "./features/git-page/ui/reread-action/reread-action.js";

export const GitPlugin = plugin("git")
	.require(AppsPlugin)
	.fill(
		AppsSlot({
			id: "git",
			title: "Git",
			icon: GIT_ICON,
			view: LazyGitView,
			actions: [RereadAction],
			tabModules: () => [GitModule],
			titleOf: gitTitleOf,
		}),
	);
