import { apps } from "@sumi/apps-plugin";
import { commandMenu } from "@sumi/command-menu-plugin";
import { backend, shell, sumiHost, windows } from "@sumi/sumi-host-plugin";
import { navigation } from "@sumi/navigation-plugin";
import { chatFacts as chatFactsContract } from "@sumi/chat-facts/contract";
import { chatFacts as chatFactsModule } from "@sumi/chat-facts/implementation";
import { agent } from "@sumi/agent-plugin";
import { chatTabs } from "@sumi/chat-tabs/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { askComposerProviderOf } from "./features/ask/ui/ask-composer-provider/ask-composer-provider.js";
import { askPageOf } from "./features/ask/lib/ask-page.js";
import { DATA_MARKS_GUIDE } from "./features/assistant/lib/data-marks-guide.js";
import type { ChatPageImportOf, ChatPageModuleOf } from "./features/chat-page/lib/chat-modules-of.js";
import { chatTabPageOf } from "./features/chat-page/lib/chat-tab-page.js";
import { NewSessionRow } from "./features/new-chat/ui/new-chat-row/new-chat-row.js";
import metadata from "../metadata.json" with { type: "json" };

export const chat = plugin("chat")
	.describe(metadata)
	.require(sumiHost, backend, windows, shell, apps, commandMenu, agent, navigation)
	.apply((app) => {
		const pageImports: ChatPageImportOf[] = [];
		const pageModules: ChatPageModuleOf[] = [];
		app.use(apps).app({
			id: "chat",
			title: "New chat",
			art: "chat",
			isListed: false,
			tabs: { isChat: true, splits: true, runsInPage: false, keepsRecord: true },
		});
		app.use(shell).tabPage(chatTabPageOf({ imports: pageImports, modules: pageModules }));
		const { placedApps } = app.use(navigation);
		app.use(backend).moduleOf(({ store }) => chatFactsModule({ store, apps: placedApps }), chatFactsContract);
		app.use(windows).module(chatTabs);
		app.use(sumiHost).slots.sidebarActions.add(NewSessionRow);
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
			pageModule: (moduleOf: ChatPageModuleOf): void => {
				pageModules.push(moduleOf);
			},
		};
	});
