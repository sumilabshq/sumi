import { Device, module } from "@widgetarium/data-framework";
import { AppHostModule } from "@widgetarium/app-host";
import { AppsModule } from "@sumi/apps";
import { BrowserModule } from "@widgetarium/browser";
import { WorkspacesModule } from "@widgetarium/workspaces";
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

export const CommandMenuModule = module("command-menu")
	.on(Device)
	.imports(AppHostModule, AppsModule, BrowserModule, WorkspacesModule)
	.config<CommandMenuConfig>()
	.provide((facts) => commandMenuPartsOn(facts))
	.handles(...handled);
