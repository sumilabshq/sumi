import { Device, module } from "@widgetarium/core/requests";
import { BrowserModule } from "@widgetarium/browser";
import { LayoutModule } from "@widgetarium/layout";
import { PlacesModule } from "@widgetarium/places";
import { WorkspacesModule } from "@widgetarium/workspaces";
import { appHostPartsOn } from "./gateways/app-host-parts/app-host-parts.gateway.js";
import {
	ChatListQuery,
	PinTabCommand,
	RereadChatListForCoreSubscriber,
	RereadChatListSubscriber,
} from "./features/chat-list/requests.js";
import {
	NameChatPaneCommand,
	OpenChatAskedOnStartCommand,
	OpenChatCommand,
	OpenNewChatCommand,
	TearOffChatCommand,
} from "./features/chat-opening/requests.js";
import {
	ClosedTabsQuery,
	RereadClosedTabsForCoreSubscriber,
	RereadClosedTabsSubscriber,
	ReopenClosedTabByIdCommand,
} from "./features/closed-tabs/requests.js";
import {
	CreateGroupCommand,
	FoldGroupCommand,
	FoldTabCommand,
	RenameGroupCommand,
	SetGroupHueCommand,
	UngroupCommand,
} from "./features/groups/requests.js";
import { ShowViewCommand, RereadShownViewSubscriber, ShownViewQuery } from "./features/shown-view/requests.js";
import {
	PlaceInViewCommand,
	CloseViewPaneCommand,
	RereadShownSplitForCoreSubscriber,
	RereadShownSplitSubscriber,
	ResizeSplitCommand,
	ShownSplitQuery,
} from "./features/splits/requests.js";
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
	PlaceTabCommand,
	RestoreTabsCommand,
	ShowTabCommand,
	RereadTabsForAccessAsksSubscriber,
	RereadTabsForChatsSubscriber,
	RereadSidebarForEssentialsSubscriber,
	KeepChatTabsSubscriber,
	RereadTabsSubscriber,
	RereadTabsForCoreSubscriber,
	RereadTabsForInkSubscriber,
	RereadTabsForPagesSubscriber,
	RememberPagesSubscriber,
	EnsurePanePagesSubscriber,
	RereadTabsForShownViewSubscriber,
	TabsSidebarQuery,
} from "./features/tabs/requests.js";

export const AppHostModule = module("app-host")
	.on(Device)
	.imports(BrowserModule, LayoutModule, PlacesModule, WorkspacesModule)
	.subscribers(
		RereadChatListSubscriber,
		RereadChatListForCoreSubscriber,
		EnsurePanePagesSubscriber,
		KeepChatTabsSubscriber,
		RereadTabsSubscriber,
		RereadTabsForCoreSubscriber,
		RereadTabsForShownViewSubscriber,
		RereadTabsForPagesSubscriber,
		RememberPagesSubscriber,
		RereadTabsForAccessAsksSubscriber,
		RereadTabsForInkSubscriber,
		RereadTabsForChatsSubscriber,
		RereadSidebarForEssentialsSubscriber,
		RereadShownViewSubscriber,
		RereadClosedTabsSubscriber,
		RereadClosedTabsForCoreSubscriber,
		RereadShownSplitSubscriber,
		RereadShownSplitForCoreSubscriber,
	)
	.public(ChatListQuery, PinTabCommand)
	.public(
		OpenChatCommand,
		OpenNewChatCommand,
		TearOffChatCommand,
		NameChatPaneCommand,
		OpenChatAskedOnStartCommand,
		AppTabsQuery,
		ClosedTabsQuery,
		ReopenClosedTabByIdCommand,
		TabsSidebarQuery,
		HeldTabsQuery,
		CanOpenOwnWindowQuery,
		ShownViewQuery,
		RestoreTabsCommand,
		ShowTabCommand,
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
		FoldTabCommand,
		UngroupCommand,
		ShowViewCommand,
		ShownSplitQuery,
		PlaceInViewCommand,
		CloseViewPaneCommand,
		ResizeSplitCommand,
	)
	.provide((facts) => ({ ...appHostPartsOn(facts) }));
