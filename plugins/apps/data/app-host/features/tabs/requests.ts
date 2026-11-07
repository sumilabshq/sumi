import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import type { AnyQuery, Send } from "@widgetarium/data-framework";
import {
	AccessAsksChangedEvent,
	BrowserTabsQuery,
	InkActivityChangedEvent,
	PagesChangedEvent,
} from "@widgetarium/browser";
import { DropGoneTabsCommand, PanesChangedEvent } from "@widgetarium/layout";
import {
	FitTabsToPanesCommand,
	HeldTabsQuery as PlacedHeldTabsQuery,
	MakeEssentialCommand,
	OpenTabInOwnWindowCommand,
	PlaceTabCommand as PlacesPlaceTabCommand,
	ReorderSplitMemberCommand,
	SidebarQuery,
	PlacedTabsQuery,
	RememberPagesCommand,
	RestoreTabsCommand as PlacesRestoreTabsCommand,
	ShowChatTabCommand as PlacesShowChatTabCommand,
	TabRowsQuery,
} from "@widgetarium/places";
import { ChatsChangedEvent } from "@widgetarium/workspaces";
import { EssentialsChangedEvent } from "../../gateways/essentials/essentials.events.js";
import { EssentialsGateway } from "../../gateways/essentials/essentials.gateway.js";
import { ShownViewChangedEvent } from "../../gateways/shown-view/shown-view.events.js";
import { StudioWindowGateway } from "../../gateways/studio-window/studio-window.gateway.js";
import { StudioCoreChangedEvent } from "../../gateways/core-changes/core-changes.events.js";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { pageTitlesOf, rememberPageTitles } from "../../shared/lib/page-titles/page-titles-read.js";
import {
	pageTabsOfRows,
	pageTabsOfSidebar,
	titledSidebarOf,
	titledTabOf,
} from "../../shared/lib/page-titles/page-titles.js";
import { addEssential, essentialsOf, nextEssentialIdOf } from "../../shared/lib/essentials/essentials.js";
import {
	keepChatTabs,
	saveEssentials,
	sendLogged,
	settleAsked,
	tabsAskOf,
} from "../../shared/lib/tab-showing/tab-settling.js";
import type { TabsReach } from "../../shared/lib/tab-showing/tab-settling.js";
import { showTabSettled } from "../../shared/lib/tab-showing/tab-opening.js";
import { AppTabsSchema, HeldTabsSchema, TabsSidebarSchema } from "../../shared/schema/app-tab.schema.js";
import { TabDropSchema } from "../../shared/schema/tab-drop.schema.js";

const ALL_PAGES = { heldTabId: null };

interface TabParts {
	readonly studioWindow: StudioWindowGateway;
	readonly essentials: EssentialsGateway;
}

interface EssentialDrop {
	readonly id: string;
	readonly at: number;
}

export const AppTabsQuery = query("app-tabs")
	.public()
	.output(AppTabsSchema)
	.handle(async (_input, { send, ...injects }) => {
		const rows = await send(TabRowsQuery, { at: await tabsAskOf({ injects, send }) });
		const titles = await pageTitlesOf(send, pageTabsOfRows(rows.tabs));
		return { ...rows, tabs: rows.tabs.map((tab) => titledTabOf(tab, titles)) };
	});

export const TabsSidebarQuery = query("tabs-sidebar")
	.public()
	.output(TabsSidebarSchema)
	.handle(async (_input, { send, ...injects }) => {
		const [at] = await Promise.all([tabsAskOf({ injects, send }), injects.essentials.essentialsLoaded()]);
		const essentials = essentialsOf(injects.essentials.essentials()).essentials;
		const sidebar = await send(SidebarQuery, { at, essentials });
		return titledSidebarOf(sidebar, await pageTitlesOf(send, pageTabsOfSidebar(sidebar)));
	});

// TODO: a transport that cannot abort (Tauri IPC) leaves held-tabs stale after a dropped call
export const HeldTabsQuery = query("held-tabs")
	.public()
	.output(HeldTabsSchema)
	.handle(async (_input, { send, ...injects }) =>
		send(PlacedHeldTabsQuery, { at: await tabsAskOf({ injects, send }) }),
	);

export const CanOpenOwnWindowQuery = query("can-open-own-window")
	.public()
	.output(z.boolean())
	.handle(async (_input, { send }) => (await send(BrowserTabsQuery, ALL_PAGES)).canOpenOwnWindow);

export const RestoreTabsCommand = command("restore-tabs")
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await readyToRestore(send, injects);
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesRestoreTabsCommand, {
				at,
				essentials: essentialsOf(injects.essentials.essentials()).essentials,
				isBeside: injects.studioWindow.opensBesideAnother(),
				keepsPages: injects.studioWindow.keepsPagesAcrossStarts(),
			}),
		);
	});

export const ShowTabCommand = command("show-tab")
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(({ id }, { send, emit, ...injects }) =>
		showTabSettled({ injects, send, told: () => emit(TabsSettledEvent) }, id),
	);

export const ShowChatTabCommand = command("show-chat-tab")
	.public()
	.input(z.object({ chatId: z.string().min(1) }))
	.idempotencyKey(Repeatable)
	.handle(async ({ chatId }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesShowChatTabCommand, { at, chatId }),
		);
	});

export const PlaceTabCommand = command("place-tab")
	.public()
	.input(z.object({ id: z.string(), to: TabDropSchema }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, to }, { send, emit, ...injects }) => {
		const reach = { injects, send, told: () => emit(TabsSettledEvent) };

		if (to.kind === "list") {
			const place = { list: to.list, groupId: to.groupId, before: to.before };
			await settleAsked(reach, (at) => send(PlacesPlaceTabCommand, { at, id, place }));
			return;
		}

		if (to.kind === "split") {
			await settleAsked(reach, (at) => send(ReorderSplitMemberCommand, { at, tabId: id, before: to.before }));
			return;
		}

		if (to.kind === "own-window") {
			await settleAsked(reach, (at) => send(OpenTabInOwnWindowCommand, { at, id }));
			return;
		}

		await makeEssential(reach, injects.essentials, { id, at: to.at });
	});

export const EnsurePanePagesSubscriber = subscriber(PanesChangedEvent).handle(
	async (_input, { send, emit, invalidate, ...injects }) => {
		invalidateTabReads(invalidate);
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(FitTabsToPanesCommand, { at }),
		);
	},
);

export const RememberPagesSubscriber = subscriber(PagesChangedEvent).handle(
	async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, async (at) => {
			const settled = await send(RememberPagesCommand, { at });
			await rememberPageTitles(send, at);
			return settled;
		});
	},
);

export const KeepChatTabsSubscriber = subscriber(ChatsChangedEvent).handle(async (_input, { send, emit }) => {
	await keepChatTabs(send);
	emit(TabsSettledEvent);
});

export const RereadTabsSubscriber = subscriber(TabsSettledEvent).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
});

export const RereadTabsForCoreSubscriber = subscriber(StudioCoreChangedEvent).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
});

export const RereadTabsForShownViewSubscriber = subscriber(ShownViewChangedEvent).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
});

export const RereadTabsForPagesSubscriber = subscriber(PagesChangedEvent).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
	invalidate(CanOpenOwnWindowQuery);
});

export const RereadTabsForAccessAsksSubscriber = subscriber(AccessAsksChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AppTabsQuery);
	invalidate(TabsSidebarQuery);
});

export const RereadTabsForInkSubscriber = subscriber(InkActivityChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AppTabsQuery);
	invalidate(TabsSidebarQuery);
});

export const RereadTabsForChatsSubscriber = subscriber(ChatsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AppTabsQuery);
	invalidate(TabsSidebarQuery);
});

export const RereadSidebarForEssentialsSubscriber = subscriber(EssentialsChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(TabsSidebarQuery);
	},
);

function invalidateTabReads(invalidate: (query: { readonly request: AnyQuery }) => void): void {
	invalidate(AppTabsQuery);
	invalidate(TabsSidebarQuery);
	invalidate(HeldTabsQuery);
}

async function dropGoneTabPanes(send: Send, window: string): Promise<void> {
	const placed = await send(PlacedTabsQuery, { window });
	const heldTabIds = placed.tabs.map(({ id }) => id);
	await sendLogged("drop the panes of gone tabs", () => send(DropGoneTabsCommand, { heldTabIds }));
}

async function readyToRestore(send: Send, injects: Pick<TabParts, "essentials" | "studioWindow">): Promise<void> {
	await injects.essentials.essentialsLoaded();
	await sendLogged("keep a tab for every chat", () => keepChatTabs(send));

	if (!injects.studioWindow.opensBesideAnother()) {
		await dropGoneTabPanes(send, injects.studioWindow.windowLabel());
	}
}

async function makeEssential(
	reach: TabsReach,
	essentials: EssentialsGateway,
	{ id, at }: EssentialDrop,
): Promise<void> {
	await essentials.essentialsLoaded();
	const kept = essentialsOf(essentials.essentials());
	const face = await reach.send(MakeEssentialCommand, {
		at: await tabsAskOf(reach),
		id,
		essentialId: nextEssentialIdOf(kept),
	});
	saveEssentials(kept, addEssential(kept, face, at), essentials);
	reach.told();
}
