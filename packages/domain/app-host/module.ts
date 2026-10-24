import { Device, module } from "@widgetarium/core/requests";
import { BrowserModule } from "@widgetarium/browser";
import { LayoutModule } from "@widgetarium/layout";
import { WorkspacesModule } from "@widgetarium/workspaces";
import { appHostPartsOn } from "./gateways/app-host-parts/app-host-parts.gateway.js";
import {
	RereadTabsColumnSubscriber,
	FoldTabListCommand,
	ResetColumnCommand,
	ResizeColumnCommand,
	TabsColumnQuery,
} from "./features/column/requests.js";
import {
	CreateGroupCommand,
	FoldGroupCommand,
	RenameGroupCommand,
	SetGroupHueCommand,
	UngroupCommand,
} from "./features/groups/requests.js";
import { ShowViewCommand, RereadShownViewSubscriber, ShownViewQuery } from "./features/shown-view/requests.js";
import {
	CloseEssentialCommand,
	PlaceEssentialCommand,
	RemoveEssentialCommand,
	ShowEssentialCommand,
} from "./features/essentials/requests.js";
import {
	CloseGroupCommand,
	CloseOtherTabsCommand,
	CloseShownTabCommand,
	CloseTabCommand,
	DuplicateTabCommand,
	OpenTabBelowCommand,
	OpenTabCommand,
	ReloadTabCommand,
	RenameTabCommand,
	ReopenClosedTabCommand,
	TearOffTabCommand,
} from "./features/tab-actions/requests.js";
import {
	AppTabsQuery,
	CanOpenOwnWindowQuery,
	HeldTabsQuery,
	MoveTabToListCommand,
	PlaceTabCommand,
	RestoreTabsCommand,
	ShowChatTabCommand,
	ShowTabCommand,
	RereadTabsForAccessAsksSubscriber,
	RereadTabsForChatsSubscriber,
	RereadSidebarForEssentialsSubscriber,
	RereadTabsSubscriber,
	RereadTabsForInkSubscriber,
	RereadTabsForPagesSubscriber,
	EnsurePanePagesSubscriber,
	RereadTabsForShownViewSubscriber,
	RereadSidebarForColumnSubscriber,
	TabsSidebarQuery,
} from "./features/tabs/requests.js";

export const AppHostModule = module("app-host")
	.on(Device)
	.imports(BrowserModule, LayoutModule, WorkspacesModule)
	.subscribers(
		EnsurePanePagesSubscriber,
		RereadTabsSubscriber,
		RereadTabsForShownViewSubscriber,
		RereadTabsForPagesSubscriber,
		RereadTabsForAccessAsksSubscriber,
		RereadTabsForInkSubscriber,
		RereadTabsForChatsSubscriber,
		RereadSidebarForEssentialsSubscriber,
		RereadSidebarForColumnSubscriber,
		RereadTabsColumnSubscriber,
		RereadShownViewSubscriber,
	)
	.public(
		AppTabsQuery,
		TabsSidebarQuery,
		HeldTabsQuery,
		CanOpenOwnWindowQuery,
		TabsColumnQuery,
		ShownViewQuery,
		RestoreTabsCommand,
		ShowTabCommand,
		ShowChatTabCommand,
		OpenTabCommand,
		OpenTabBelowCommand,
		DuplicateTabCommand,
		ReloadTabCommand,
		RenameTabCommand,
		CloseOtherTabsCommand,
		ReopenClosedTabCommand,
		CloseTabCommand,
		CloseShownTabCommand,
		PlaceTabCommand,
		MoveTabToListCommand,
		TearOffTabCommand,
		CloseGroupCommand,
		ShowEssentialCommand,
		RemoveEssentialCommand,
		CloseEssentialCommand,
		PlaceEssentialCommand,
		CreateGroupCommand,
		RenameGroupCommand,
		SetGroupHueCommand,
		FoldGroupCommand,
		UngroupCommand,
		ResizeColumnCommand,
		ResetColumnCommand,
		FoldTabListCommand,
		ShowViewCommand,
	)
	.provide((facts) => ({ ...appHostPartsOn(facts) }));
