import { apps } from "@sumi/apps-plugin";
import { commandMenu } from "@sumi/command-menu-plugin";
import { shell, sumiHost, windows } from "@sumi/sumi-host-plugin";
import { agent } from "@sumi/agent-plugin";
import { chatTabs } from "@sumi/chat-tabs/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { askComposerProviderOf } from "./features/ask/ui/ask-composer-provider/ask-composer-provider.js";
import { askPageOf } from "./features/ask/lib/ask-page.js";
import { DATA_MARKS_GUIDE } from "./features/assistant/lib/data-marks-guide.js";
import type { ChatPageImportOf } from "./features/chat-page/lib/chat-modules-of.js";
import { chatTabPageOf } from "./features/chat-page/lib/chat-tab-page.js";
import { isOutsideHolders } from "./features/chat-page/lib/chat-standing.js";
import { NewChatRow } from "./features/new-chat/ui/new-chat-row/new-chat-row.js";

export const chat = plugin("chat")
	.require(sumiHost, windows, shell, apps, commandMenu, agent)
	.apply((app) => {
		const pageImports: ChatPageImportOf[] = [];
		app.use(apps).app({
			id: "chat",
			title: "New chat",
			art: "chat",
			isListed: false,
			tabs: { canStandIn: isOutsideHolders, holdsTabs: true, splits: true, runsInPage: false, keepsRecord: true },
		});
		app.use(shell).tabPage(chatTabPageOf(pageImports));
		app.use(windows).module(chatTabs);
		app.use(sumiHost).slots.sidebarActions.add(NewChatRow);
		app.use(shell).provider(askComposerProviderOf);
		app.use(commandMenu).door({
			id: "ask",
			letter: "i",
			label: "Ask",
			placeholder: "Ask Sumi anything",
			startsWith: "empty",
		});
		app.use(commandMenu).page({ id: "ask", draftsOf: askPageOf });
		app.use(agent).addPromptPart(() => DATA_MARKS_GUIDE);
		return {
			pageImport: (importOf: ChatPageImportOf): void => {
				pageImports.push(importOf);
			},
		};
	});
