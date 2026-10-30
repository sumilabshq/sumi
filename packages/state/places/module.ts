import { PublicGuard, Server, module } from "@widgetarium/core/requests";
import { placesPartsOn } from "./gateways/places-parts/places-parts.gateway.js";
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
	KeepChatTabsCommand,
	MakeEssentialCommand,
	PinTabCommand,
	PlaceTabCommand,
	RenameGroupCommand,
	RenameTabCommand,
	SetGroupHueCommand,
	UngroupCommand,
} from "./features/tab-placing/requests.js";
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
	.guard(PublicGuard)
	.subscribers(RereadWindowsSubscriber, RereadPlacedTabsSubscriber)
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
		CreateGroupCommand,
		RenameGroupCommand,
		SetGroupHueCommand,
		FoldGroupCommand,
		UngroupCommand,
	)
	.provide((facts) => placesPartsOn(facts));
