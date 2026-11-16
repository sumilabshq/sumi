import { AuthenticatedGuard } from "@widgetarium/data-framework";
import { query } from "#module";
import { appHost } from "@widgetarium/app-host/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { NoInputSchema, WorkspaceStateSchema } from "../../shared/schema/workspace.schema.js";
import { workspaceStateOf } from "./lib/workspace-state.js";

export const state = query()
	.public()
	.metadata({
		description:
			"Read Sumi's state: every chat, which chat is asking, the tab the person sees, and the tab list with its tabs and groups; a chat is a tab with app chat. Read it before acting on tabs.",
	})
	.input(NoInputSchema)
	.output(WorkspaceStateSchema)
	.guard(AuthenticatedGuard)
	.handle(async (_asked, { send, user }) => {
		const [sidebar, chats, tabs] = await Promise.all([
			send(appHost.tabs.tabsSidebar),
			send(chatTabs.chatList.all),
			send(appHost.tabs.appTabs),
		]);
		return workspaceStateOf({ sidebar, chats, tabs }, user.id);
	});
