import { z } from "zod";
import { Repeatable, command, query, subscriber } from "@widgetarium/core/requests";
import type { AnyQuery, Send } from "@widgetarium/core/requests";
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
	PlacedSidebarQuery,
	PlacedTabsQuery,
	RememberPagesCommand,
	RestoreTabsCommand as PlacesRestoreTabsCommand,
	ShowChatTabCommand as PlacesShowChatTabCommand,
	ShowTabCommand as PlacesShowTabCommand,
	TabRowsQuery,
} from "@widgetarium/places";
import { ChatListQuery, ChatsChangedEvent } from "@widgetarium/workspaces";
import { EssentialsChangedEvent } from "../../gateways/essentials/essentials.events.js";
import { EssentialsGateway } from "../../gateways/essentials/essentials.gateway.js";
import { PaneFlashGateway } from "../../gateways/pane-flash/pane-flash.gateway.js";
import { ShownViewChangedEvent } from "../../gateways/shown-view/shown-view.events.js";
import { ShownViewGateway } from "../../gateways/shown-view/shown-view.gateway.js";
import { StudioWindowGateway } from "../../gateways/studio-window/studio-window.gateway.js";
import { TabsColumnChangedEvent } from "../../gateways/tabs-column/tabs-column.events.js";
import { TabsColumnGateway } from "../../gateways/tabs-column/tabs-column.gateway.js";
import { StudioCoreChangedEvent, TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { addEssential, essentialsOf, nextEssentialIdOf } from "../../shared/lib/essentials/essentials.js";
import { sidebarViewOf } from "../../shared/lib/tabs-column/column-look.js";
import {
	keepChatTabs,
	saveEssentials,
	sendLogged,
	settleAsked,
	tabsAskOf,
} from "../../shared/lib/tab-showing/tab-settling.js";
import type { TabsReach } from "../../shared/lib/tab-showing/tab-settling.js";
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
const TAB_PARTS = {
	studioWindow: StudioWindowGateway,
	essentials: EssentialsGateway,
	shownView: ShownViewGateway,
	paneFlash: PaneFlashGateway,
};

export const AppTabsQuery = query("app-tabs")
	.output(AppTabsSchema)
	.inject(TAB_PARTS)
	.handle(async (_input, { send, ...parts }) => send(TabRowsQuery, { at: await tabsAskOf({ parts, send }) }));

export const TabsSidebarQuery = query("tabs-sidebar")
	.output(TabsSidebarSchema)
	.inject({
		...TAB_PARTS,
		tabsColumn: TabsColumnGateway,
	})
	.handle(async (_input, { send, tabsColumn, ...parts }) => {
		const [at, chatList] = await Promise.all([
			tabsAskOf({ parts, send }),
			send(ChatListQuery),
			parts.essentials.essentialsLoaded(),
		]);
		const onBoard = new Set(at.screen.chatGroups.map((group) => group.chatId));
		return send(PlacedSidebarQuery, {
			at,
			essentials: essentialsOf(parts.essentials.essentials()).essentials,
			boardChats: [...chatList.pinned, ...chatList.recents]
				.filter((row) => onBoard.has(row.id))
				.map(({ id, title }) => ({ id, title })),
			shutLists: tabsColumn.column().shutLists,
			look: sidebarViewOf(tabsColumn.column()),
		});
	});

export const HeldTabsQuery = query("held-tabs")
	.output(HeldTabsSchema)
	.inject(TAB_PARTS)
	.handle(async (_input, { send, ...parts }) => send(PlacedHeldTabsQuery, { at: await tabsAskOf({ parts, send }) }));

export const CanOpenOwnWindowQuery = query("can-open-own-window")
	.output(z.boolean())
	.handle(async (_input, { send }) => (await send(BrowserTabsQuery, ALL_PAGES)).canOpenOwnWindow);

export const RestoreTabsCommand = command("restore-tabs")
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async (_input, { send, emit, ...parts }) => {
		await readyToRestore(send, parts);
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesRestoreTabsCommand, {
				at,
				essentials: essentialsOf(parts.essentials.essentials()).essentials,
				isBeside: parts.studioWindow.opensBesideAnother(),
				keepsPages: parts.studioWindow.keepsPagesAcrossStarts(),
			}),
		);
	});

export const ShowTabCommand = command("show-tab")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesShowTabCommand, { at, id }),
		);
	});

export const ShowChatTabCommand = command("show-chat-tab")
	.input(z.object({ chatId: z.string().min(1) }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ chatId }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesShowChatTabCommand, { at, chatId }),
		);
	});

export const PlaceTabCommand = command("place-tab")
	.input(z.object({ id: z.string(), to: TabDropSchema }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id, to }, { send, emit, ...parts }) => {
		const reach = { parts, send, told: () => emit(TabsSettledEvent) };

		if (to.kind === "list") {
			const place = { list: to.list, groupId: to.groupId, before: to.before };
			await settleAsked(reach, (at) => send(PlacesPlaceTabCommand, { at, id, place }));
			return;
		}

		if (to.kind === "own-window") {
			await settleAsked(reach, (at) => send(OpenTabInOwnWindowCommand, { at, id }));
			return;
		}

		await makeEssential(reach, parts.essentials, { id, at: to.at });
	});

export const MoveTabToListCommand = command("move-tab-to-list")
	.input(z.object({ id: z.string(), list: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id, list }, { send, emit, ...parts }) => {
		const place = { list, groupId: null, before: null };
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesPlaceTabCommand, { at, id, place }),
		);
	});

export const EnsurePanePagesSubscriber = subscriber(PanesChangedEvent)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async (_input, { send, emit, invalidate, ...parts }) => {
		invalidateTabReads(invalidate);
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) => send(FitTabsToPanesCommand, { at }));
	});

export const RememberPagesSubscriber = subscriber(PagesChangedEvent)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async (_input, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) => send(RememberPagesCommand, { at }));
	});

export const KeepChatTabsSubscriber = subscriber(ChatsChangedEvent)
	.emits(TabsSettledEvent)
	.handle(async (_input, { send, emit }) => {
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

export const RereadSidebarForColumnSubscriber = subscriber(TabsColumnChangedEvent).handle((_input, { invalidate }) => {
	invalidate(TabsSidebarQuery);
});

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

async function readyToRestore(send: Send, parts: Pick<TabParts, "essentials" | "studioWindow">): Promise<void> {
	await parts.essentials.essentialsLoaded();
	await sendLogged("keep a tab for every chat", () => keepChatTabs(send));

	if (!parts.studioWindow.opensBesideAnother()) {
		await dropGoneTabPanes(send, parts.studioWindow.windowLabel());
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
