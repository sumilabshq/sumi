import { apps } from "@sumi/apps-plugin";
import { git as gitModule } from "@sumi/git/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { GIT_LINK_GUIDE, gitTitleOf } from "./features/git-page/lib/git-address.js";
import { GIT_ICON } from "./features/git-page/lib/git-icon.js";
import { LazyGitView } from "./features/git-page/lib/lazy-git-view.js";
import { RereadAction } from "./features/git-page/ui/reread-action/reread-action.js";
import { WrapAction } from "./features/git-page/ui/wrap-action/wrap-action.js";
import { FileListAction } from "./features/git-page/ui/file-list-action/file-list-action.js";

export const git = plugin("git")
	.require(apps)
	.apply((app) => {
		app.use(apps).app({
			id: "git",
			title: "Git",
			icon: GIT_ICON,
			view: LazyGitView,
			actions: [FileListAction, WrapAction, RereadAction],
			tabModules: () => [gitModule],
			titleOf: gitTitleOf,
			linkGuide: GIT_LINK_GUIDE,
		});
	});
