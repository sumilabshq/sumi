import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { PLACES_HOST_NEEDS, keptPlacesParts } from "./gateways/places-parts/places-parts.gateway.js";
import {
	CloseEssentialTabCommand,
	CloseGroupCommand,
	CloseOtherTabsCommand,
	CloseShownTabCommand,
	CloseTabCommand,
} from "./features/tab-closing/requests.js";
import {
	DuplicateTabCommand,
	OpenTabBelowCommand,
	OpenTabCommand,
	ReleaseEssentialTabCommand,
	ReopenClosedTabCommand,
	ShowEssentialTabCommand,
} from "./features/tab-opening/requests.js";
import {
	CreateGroupCommand,
	FoldGroupCommand,
	FoldTabCommand,
	MakeEssentialCommand,
	PinTabCommand,
	PlaceTabCommand,
	RenameGroupCommand,
	RenameTabCommand,
	SetGroupHueCommand,
	PlaceGroupCommand,
	UngroupCommand,
} from "./features/tab-placing/requests.js";
import {
	AppCallersGuard,
	AppTabQuery,
	AskedLinksQuery,
	OpenLinkCommand,
	RereadAppTabSubscriber,
	RereadAskedLinksSubscriber,
	TakeAskedLinkCommand,
	ForgetRunningTurnsCommand,
	KeepChatTabsCommand,
	MarkTabSeenCommand,
	PressAppActionCommand,
	RecordAppPageCommand,
	RecordTabTurnCommand,
	TakeActionPressCommand,
} from "./features/tab-facts/requests.js";
import { GoBackInTabCommand, GoForwardInTabCommand } from "./features/tab-history/requests.js";
import {
	FitTabsToPanesCommand,
	OpenTabInOwnWindowCommand,
	ReloadTabCommand,
	RememberPagesCommand,
	RestoreTabsCommand,
	ShowChatTabCommand,
	ShowTabCommand,
	TearOffTabCommand,
} from "./features/tab-showing/requests.js";
import {
	PlaceInViewCommand,
	RemoveFromSplitCommand,
	ReorderSplitMemberCommand,
	ResizeSplitCommand,
	RereadShownSplitSubscriber,
	ShownSplitQuery,
} from "./features/splits/requests.js";
import {
	AppFacesQuery,
	ChatTabsQuery,
	ClosedTabsQuery,
	HeldTabsQuery,
	SidebarQuery,
	PlacedTabsQuery,
	RereadPlacedTabsSubscriber,
	TabRowsQuery,
} from "./features/tabs/requests.js";
import {
	CloseWindowCommand,
	KeepLiveWindowsCommand,
	OpenWindowCommand,
	OpenWindowsQuery,
	RereadWindowsSubscriber,
} from "./features/windows/requests.js";

export const PlacesModule = module("places")
	.on(Server)
	.needs(PLACES_HOST_NEEDS)
	.guard(PublicGuard)
	.guard(AppCallersGuard)
	.subscribers(
		RereadWindowsSubscriber,
		RereadPlacedTabsSubscriber,
		RereadShownSplitSubscriber,
		RereadAppTabSubscriber,
		RereadAskedLinksSubscriber,
	)
	.public(
		OpenWindowsQuery,
		OpenWindowCommand,
		CloseWindowCommand,
		KeepLiveWindowsCommand,
		PlacedTabsQuery,
		TabRowsQuery,
		SidebarQuery,
		HeldTabsQuery,
		ClosedTabsQuery,
		ChatTabsQuery,
		AppFacesQuery,
		AppTabQuery,
		AskedLinksQuery,
		PressAppActionCommand,
		TakeActionPressCommand,
	)
	.public(
		RestoreTabsCommand,
		ShowTabCommand,
		ShowChatTabCommand,
		FitTabsToPanesCommand,
		RememberPagesCommand,
		OpenTabInOwnWindowCommand,
		TearOffTabCommand,
		ReloadTabCommand,
		OpenTabCommand,
		OpenTabBelowCommand,
		DuplicateTabCommand,
		ReopenClosedTabCommand,
		ShowEssentialTabCommand,
		ReleaseEssentialTabCommand,
		CloseTabCommand,
		CloseOtherTabsCommand,
		CloseShownTabCommand,
		CloseGroupCommand,
		CloseEssentialTabCommand,
		PlaceTabCommand,
		MakeEssentialCommand,
		RenameTabCommand,
		PinTabCommand,
		KeepChatTabsCommand,
		RecordTabTurnCommand,
		RecordAppPageCommand,
		OpenLinkCommand,
		TakeAskedLinkCommand,
		GoBackInTabCommand,
		GoForwardInTabCommand,
		MarkTabSeenCommand,
		ForgetRunningTurnsCommand,
		CreateGroupCommand,
		RenameGroupCommand,
		SetGroupHueCommand,
		FoldGroupCommand,
		FoldTabCommand,
		PlaceGroupCommand,
		UngroupCommand,
		ShownSplitQuery,
		PlaceInViewCommand,
		RemoveFromSplitCommand,
		ReorderSplitMemberCommand,
		ResizeSplitCommand,
	)
	.provide(({ scope, host }) => keptPlacesParts(host.store, scope.workspaceId));
