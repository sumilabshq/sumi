import { Device, module } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host";
import { apps } from "@sumi/apps";
import { chatTabs } from "@sumi/chat-tabs";
import { browser } from "@widgetarium/browser";
import { workspaces } from "@widgetarium/workspaces";
import type { CommandMenuConfig } from "./shared/host/command-menu.host.js";
import { commandMenuPartsOn } from "./gateways/command-menu-parts/command-menu-parts.gateway.js";
import { handled } from "./generated/handled.js";

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

export const commandMenu = module()
	.on(Device)
	.imports(appHost, apps, browser, chatTabs, workspaces)
	.config<CommandMenuConfig>()
	.provide((facts) => commandMenuPartsOn(facts))
	.handles(handled);
