import { apps } from "@sumi/apps-plugin";
import { commandMenu } from "@sumi/command-menu-plugin";
import { shell, windows } from "@sumi/sumi-host-plugin";
import { assistant as assistantModule } from "@widgetarium/assistant/implementation";
import { chatTabs } from "@sumi/chat-tabs/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { askComposerProviderOf } from "./features/ask/ui/ask-composer-provider/ask-composer-provider.js";
import { askPageOf } from "./features/ask/lib/ask-page.js";
import type { ChatPageImportOf } from "./features/chat-page/lib/chat-modules-of.js";
import { chatTabPageOf } from "./features/chat-page/lib/chat-tab-page.js";
import { isOutsideHolders } from "./features/chat-page/lib/chat-standing.js";

export const chat = plugin("chat")
	.require(windows, shell, apps, commandMenu)
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
		app.use(windows).serverModule(({ assistant }) => assistantModule(assistant));
		app.use(shell).provider(askComposerProviderOf);
		app.use(commandMenu).door({
			id: "ask",
			letter: "i",
			label: "Ask",
			placeholder: "Ask Sumi anything",
			startsWith: "empty",
		});
		app.use(commandMenu).page({ id: "ask", draftsOf: askPageOf });
		return {
			pageImport: (importOf: ChatPageImportOf): void => {
				pageImports.push(importOf);
			},
		};
	});
