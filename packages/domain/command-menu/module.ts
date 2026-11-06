import { Device, module } from "@widgetarium/data-framework";
import { AppHostModule } from "@widgetarium/app-host";
import { BrowserModule } from "@widgetarium/browser";
import { WorkspacesModule } from "@widgetarium/workspaces";
import { commandMenuPartsOn } from "./gateways/command-menu-parts/command-menu-parts.gateway.js";
import { DoRowCommand, RenameRowCommand } from "./features/doing/requests.js";
import {
	ChangeMenuDoorCommand,
	CloseCommandMenuCommand,
	CommandMenuQuery,
	MenuOnMenuChangedSubscriber,
	ToggleCommandMenuCommand,
} from "./features/opening/requests.js";
import {
	CommandMenuResultsQuery,
	ResultsOnChatsChangedSubscriber,
	ResultsOnMenuChangedSubscriber,
	ResultsOnPagesChangedSubscriber,
} from "./features/results/requests.js";

export const CommandMenuModule = module("command-menu")
	.on(Device)
	.imports(AppHostModule, BrowserModule, WorkspacesModule)
	.subscribers(
		MenuOnMenuChangedSubscriber,
		ResultsOnMenuChangedSubscriber,
		ResultsOnChatsChangedSubscriber,
		ResultsOnPagesChangedSubscriber,
	)
	.public(
		CommandMenuQuery,
		CommandMenuResultsQuery,
		ToggleCommandMenuCommand,
		ChangeMenuDoorCommand,
		CloseCommandMenuCommand,
		DoRowCommand,
		RenameRowCommand,
	)
	.provide((facts) => commandMenuPartsOn(facts));
