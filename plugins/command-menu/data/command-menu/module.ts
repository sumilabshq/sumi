import { Device, module } from "@widgetarium/data-framework";
import { AppHostModule } from "@widgetarium/app-host";
import { BrowserModule } from "@widgetarium/browser";
import { WorkspacesModule } from "@widgetarium/workspaces";
import type { CommandMenuConfig } from "./shared/host/command-menu.host.js";
import { commandMenuPartsOn } from "./gateways/command-menu-parts/command-menu-parts.gateway.js";
import { DoRowCommand, RenameRowCommand } from "./features/doing/requests.js";
import {
	ChangeMenuDoorCommand,
	CloseCommandMenuCommand,
	CommandMenuQuery,
	MenuDoorsQuery,
	MenuOnMenuChangedSubscriber,
	ToggleCommandMenuCommand,
} from "./features/opening/requests.js";
import {
	CommandMenuResultsQuery,
	ResultsOnChatsChangedSubscriber,
	ResultsOnMenuChangedSubscriber,
	ResultsOnPagesChangedSubscriber,
} from "./features/results/requests.js";

export type {
	CommandMenuConfig,
	DraftedMenu,
	DraftsOf,
	FilledDoor,
	FilledPage,
	FilledRowSource,
	PageAsk,
	RowsOf,
} from "./shared/host/command-menu.host.js";

export const CommandMenuModule = module("command-menu")
	.on(Device)
	.imports(AppHostModule, BrowserModule, WorkspacesModule)
	.config<CommandMenuConfig>()
	.subscribers(
		MenuOnMenuChangedSubscriber,
		ResultsOnMenuChangedSubscriber,
		ResultsOnChatsChangedSubscriber,
		ResultsOnPagesChangedSubscriber,
	)
	.public(
		CommandMenuQuery,
		MenuDoorsQuery,
		CommandMenuResultsQuery,
		ToggleCommandMenuCommand,
		ChangeMenuDoorCommand,
		CloseCommandMenuCommand,
		DoRowCommand,
		RenameRowCommand,
	)
	.provide((facts) => commandMenuPartsOn(facts));
