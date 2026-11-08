import { Device, module } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { apps } from "@sumi/apps/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { browser } from "@widgetarium/browser/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import type { CommandMenuConfig } from "./shared/host/command-menu.host.js";
import { commandMenuPartsOn } from "./gateways/command-menu-parts/command-menu-parts.gateway.js";

export type {
	CommandMenuConfig,
	Draft,
	DraftedMenu,
	DraftsOf,
	FilledDoor,
	FilledPage,
	FilledRowSource,
	Found,
	PageAsk,
	RowsOf,
} from "./shared/host/command-menu.host.js";

export const commandMenu = module("command-menu")
	.on(Device)
	.imports(appHost, apps, browser, chatTabs, workspaces)
	.config<CommandMenuConfig>()
	.provide((facts) => commandMenuPartsOn(facts));
