import { agent } from "@sumi/agent-plugin";
import { apps } from "@sumi/apps-plugin";
import { chat } from "@sumi/chat-plugin";
import { terminal } from "@sumi/contract";
import { git as gitModule } from "@sumi/git/implementation";
import { ShownChangesSchema } from "@sumi/git-work/contract";
import { gitWork } from "@sumi/git-work/implementation";
import { mcpApps } from "@sumi/mcp-apps-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { GIT_LINK_GUIDE, gitTitleOf } from "./features/git-page/lib/git-address.js";
import { GIT_ICON } from "./features/git-page/lib/git-icon.js";
import { LazyGitView } from "./features/git-page/lib/lazy-git-view.js";
import { CHANGES_CARD_HEIGHT, ChangesCard } from "./features/git-page/ui/changes-card/changes-card.js";
import { RereadAction } from "./features/git-page/ui/reread-action/reread-action.js";
import { WrapAction } from "./features/git-page/ui/wrap-action/wrap-action.js";
import { FileListAction } from "./features/git-page/ui/file-list-action/file-list-action.js";
import metadata from "../metadata.json" with { type: "json" };

export const git = plugin("git")
	.describe(metadata)
	.require(apps, agent, chat, mcpApps)
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
		app.use(agent).mcp.addServer({
			name: "git",
			modules: [gitWork],
			importsOf: (core) => [terminal({ over: core })],
		});
		app.use(chat).pageModule(() => gitModule);
		app.use(mcpApps).add({
			name: "git-changes",
			schema: ShownChangesSchema,
			view: ChangesCard,
			height: CHANGES_CARD_HEIGHT,
			guide:
				"git-work_changes_show-changes: git changes as a card, any two sides: uncommitted, one commit, two commits or branches. One file opens as its diff, several as a list the person presses into. Use it instead of pasting a diff.",
		});
	});
