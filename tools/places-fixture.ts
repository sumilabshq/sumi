import { BUILT_IN_APPS, builtInPlacedApps } from "./placed-apps-fixture.ts";
import type { ListedPlacedAppsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/placed-apps/listed.gateway.ts";
import { localTransport, runtime } from "../packages/shared/data-framework/src/index.ts";
import type { RemoteModule, RemoteTransport, ServerSideModule } from "../packages/shared/data-framework/src/index.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { navigation as placesModule } from "../plugins/tabs/navigation/data/navigation/generated/module.ts";
import { tabGroups as tabGroupsModule } from "../plugins/tabs/tab-groups/data/tab-groups/generated/module.ts";
import { tabGroups } from "../plugins/tabs/tab-groups/data/tab-groups/generated/contract.ts";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { z } from "zod";
import { groupEntriesOf } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/tauri/group-entries.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { momentOfWindow, windowTabsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/kept-tabs.ts";
import {
	ClosedTabSchema,
	KeptGroupSchema,
	KeptTabSchema,
	ListEntrySchema,
	PlacedTabsSchema,
	WindowViewSchema,
} from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import type { ListEntry } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import type { Screen } from "../plugins/tabs/navigation/data/navigation/shared/schema/screen.schema.ts";
import type {
	PlacedTabs,
	StudioView,
	TabMark,
	WindowTabs,
} from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { chatFacts } from "../plugins/ai/chat/data/chat-facts/generated/contract.ts";
import { chatFacts as chatFactsModule } from "../plugins/ai/chat/data/chat-facts/generated/module.ts";

export const MAIN_WINDOW = "main";

export const BARE_SCREEN: Screen = {
	pages: [],
	isBrowserAvailable: false,
	canOpenOwnWindow: false,
	tabPanes: [],
	shownTabPaneId: null,
	tabTargetId: null,
	chatGroups: [],
	elsewhere: [],
};

const OldGroupSchema = KeptGroupSchema.omit({ entries: true }).extend({ tabIds: z.array(z.string()) });

const SeededTabsSchema = z.object({
	tabs: z.array(KeptTabSchema),
	lists: z.record(z.string(), z.array(ListEntrySchema)).nullable().default(null),
	groups: z.array(z.union([KeptGroupSchema, OldGroupSchema])).default([]),
	shownId: z.string().nullable(),
	minted: z.number().int().nonnegative(),
	closed: z.array(ClosedTabSchema),
});

export type SeededTabs = z.input<typeof SeededTabsSchema>;

export interface SeededFacts {
	readonly title?: string;
	readonly mark?: TabMark;
}

export function placedTabsOf(
	seed: SeededTabs,
	chatIds: readonly string[] = [],
	factsOf: Readonly<Record<string, SeededFacts>> = {},
): PlacedTabs {
	const session = SeededTabsSchema.parse(groupEntriesOf(seed).tabs);
	const heldIds = new Set(session.tabs.map((tab) => tab.id));
	const chatTabs = chatIds
		.filter((id) => !heldIds.has(id))
		.map((id) => ({ id, app: "chat", pageId: null, label: null }));
	const lists = session.lists ?? {
		workspace: session.tabs.map((tab) => tabEntryOf(tab.id)),
	};
	const listed = Object.values(lists).flat();
	const placed = PlacedTabsSchema.parse({
		tabs: [...session.tabs, ...chatTabs],
		lists: {
			workspace: [...chatIds.map(tabEntryOf), ...listed],
		},
		groups: session.groups,
		views: { [MAIN_WINDOW]: { shownId: session.shownId } },
		minted: session.minted,
		closed: session.closed,
	});
	return {
		...placed,
		tabs: placed.tabs.map((tab) => ({ ...tab, ...factsOf[tab.id] })),
	};
}

function tabEntryOf(id: string): ListEntry {
	return { kind: "tab", id };
}

export function withWindowView(placed: PlacedTabs, view: StudioView, windowLabel = MAIN_WINDOW): PlacedTabs {
	const was = placed.views[windowLabel] ?? WindowViewSchema.parse({ shownId: null });
	return {
		...placed,
		views: {
			...placed.views,
			[windowLabel]: {
				...was,
				view,
			},
		},
	};
}

export function placesLinkOf(
	tabs: MemoryTabsGateway,
	besidePlaces: readonly ServerSideModule[] = [],
	placedApps: ListedPlacedAppsGateway = builtInPlacedApps(),
): RemoteTransport {
	const link = localTransport();
	const parts = {
		tabs,
		placedApps,
	};
	link.serve(
		runtime()
			.modules(
				placesModule({ injects: parts }),
				tabGroupsModule({ injects: parts }),
				chatFactsModule({ injects: parts }),
				...besidePlaces,
			)
			.start({ platform: "server", env: {}, scope: { workspaceId: "places-core" } }),
		{ authenticate: new AppCallerAuthenticate() },
	);
	return link;
}

export function placesOver(
	tabs: MemoryTabsGateway = new MemoryTabsGateway(),
	placedApps: ListedPlacedAppsGateway = builtInPlacedApps(),
): readonly RemoteModule[] {
	const link = placesLinkOf(tabs, [], placedApps);
	return [navigation({ over: link }), tabGroups({ over: link }), chatFacts({ over: link })];
}

export async function windowTabsIn(tabs: MemoryTabsGateway, window = MAIN_WINDOW): Promise<WindowTabs> {
	return windowTabsOf(momentOfWindow(await tabs.placedTabs(), window, BUILT_IN_APPS));
}
