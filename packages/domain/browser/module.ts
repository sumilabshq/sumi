import { Device, module } from "@widgetarium/core/requests";
import { AccessAsksChangedEvent } from "./gateways/access-asks/access-asks.events.js";
import { PagesChangedEvent } from "./gateways/browser-pages/browser-pages.events.js";
import { InkActivityChangedEvent } from "./gateways/ink-activity/ink-activity.events.js";
import { browserPartsOn } from "./gateways/browser-parts/browser-parts.gateway.js";
import {
	AccessAsksQuery,
	AnswerAskCommand,
	RereadAccessAsksSubscriber,
	RereadInkReadingSubscriber,
	InkReadingQuery,
	StopInkCommand,
} from "./features/asks/requests.js";
import {
	CapturePageCommand,
	InkOpenAddressCommand,
	ReadPageContentCommand,
	SearchWebCommand,
} from "./features/ink/requests.js";
import {
	PageHeadQuery,
	RereadPageHeadSubscriber,
	RereadPageHeadForPagesSubscriber,
} from "./features/page-look/requests.js";
import {
	KeepOnceOnTabsSubscriber,
	SetSiteLevelCommand,
	SiteAccessQuery,
	RereadSiteAccessSubscriber,
	RereadSiteAccessForOnceAllowancesSubscriber,
	RereadSiteAccessForPagesSubscriber,
} from "./features/sites/requests.js";
import {
	AskInkPromptQuery,
	AttachPagesCommand,
	BrowserTabsQuery,
	ClosePageCommand,
	DetachPagesCommand,
	FocusOwnWindowCommand,
	FocusStudioWindowCommand,
	OpenChatWindowCommand,
	GoBackCommand,
	GoForwardCommand,
	LeaveFailureCommand,
	NoteVisitsSubscriber,
	OpenAddressCommand,
	OpenPageCommand,
	OpenTabInOwnWindowCommand,
	ReloadPageCommand,
	ShowTabCommand,
	RereadBrowserTabsForGrantsSubscriber,
	RereadBrowserTabsForInkSubscriber,
	RereadBrowserTabsForOnceAllowancesSubscriber,
	RereadBrowserTabsSubscriber,
	RereadBrowserTabsForRecentSitesSubscriber,
	TearOffCommand,
	LayTearOffGhostCommand,
	WearTearOffGhostCommand,
	ShowTearOffGhostCommand,
} from "./features/tabs/requests.js";

export const BrowserModule = module("browser")
	.on(Device)
	.subscribers(
		KeepOnceOnTabsSubscriber,
		NoteVisitsSubscriber,
		RereadBrowserTabsSubscriber,
		RereadBrowserTabsForGrantsSubscriber,
		RereadBrowserTabsForOnceAllowancesSubscriber,
		RereadBrowserTabsForInkSubscriber,
		RereadBrowserTabsForRecentSitesSubscriber,
		RereadSiteAccessSubscriber,
		RereadSiteAccessForOnceAllowancesSubscriber,
		RereadSiteAccessForPagesSubscriber,
		RereadAccessAsksSubscriber,
		RereadInkReadingSubscriber,
		RereadPageHeadForPagesSubscriber,
		RereadPageHeadSubscriber,
	)
	.public(
		BrowserTabsQuery,
		AskInkPromptQuery,
		PageHeadQuery,
		SiteAccessQuery,
		AccessAsksQuery,
		InkReadingQuery,
		OpenAddressCommand,
		OpenTabInOwnWindowCommand,
		FocusOwnWindowCommand,
		FocusStudioWindowCommand,
		OpenChatWindowCommand,
		TearOffCommand,
		LayTearOffGhostCommand,
		WearTearOffGhostCommand,
		ShowTearOffGhostCommand,
		ShowTabCommand,
		OpenPageCommand,
		ClosePageCommand,
		GoBackCommand,
		GoForwardCommand,
		ReloadPageCommand,
		LeaveFailureCommand,
		AttachPagesCommand,
		DetachPagesCommand,
		SetSiteLevelCommand,
		AnswerAskCommand,
		StopInkCommand,
		ReadPageContentCommand,
		CapturePageCommand,
		InkOpenAddressCommand,
		SearchWebCommand,
		PagesChangedEvent,
		InkActivityChangedEvent,
		AccessAsksChangedEvent,
	)
	.provide((facts) => browserPartsOn(facts));
