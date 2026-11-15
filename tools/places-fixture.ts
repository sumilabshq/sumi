import { BUILT_IN_APPS, builtInPlacedApps, mainHome } from "./placed-apps-fixture.ts";
import { localTransport, runtime } from "../packages/shared/data-framework/src/index.ts";
import type { RemoteModule, RemoteTransport, ServerSideModule } from "../packages/shared/data-framework/src/index.ts";
import { places } from "../plugins/tab-strip/data/places/generated/contract.ts";
import { places as placesModule } from "../plugins/tab-strip/data/places/generated/module.ts";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { z } from "zod";
import { MemoryTabsGateway } from "../plugins/tab-strip/data/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../plugins/tab-strip/data/places/gateways/windows/memory.gateway.ts";
import { momentOfWindow, windowTabsOf } from "../plugins/tab-strip/data/places/shared/lib/tabs/kept-tabs.ts";
import {
	ClosedTabSchema,
	KeptGroupSchema,
	KeptTabSchema,
	ListEntrySchema,
	PlacedTabsSchema,
	WindowViewSchema,
} from "../plugins/tab-strip/data/places/shared/schema/tabs.schema.ts";
import type { ListEntry } from "../plugins/tab-strip/data/places/shared/schema/tabs.schema.ts";
import type { Screen } from "../plugins/tab-strip/data/places/shared/schema/screen.schema.ts";
import type {
	PlacedTabs,
	StudioView,
	TabMark,
	WindowTabs,
} from "../plugins/tab-strip/data/places/shared/schema/tabs.schema.ts";

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

const SeededTabsSchema = z.object({
	tabs: z.array(KeptTabSchema),
	lists: z.record(z.string(), z.array(ListEntrySchema)).nullable().default(null),
	groups: z.array(KeptGroupSchema).default([]),
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
	const session = SeededTabsSchema.parse(seed);
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
			"window:main": [...chatIds.map(tabEntryOf), ...listed],
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

export function placesLinkOf(tabs: MemoryTabsGateway, besidePlaces: readonly ServerSideModule[] = []): RemoteTransport {
	const link = localTransport();
	link.serve(
		runtime()
			.modules(
				placesModule({
					injects: {
						windows: new MemoryWindowsGateway({ windows: [] }),
						tabs,
						placedApps: builtInPlacedApps(),
						home: mainHome(),
					},
				}),
				...besidePlaces,
			)
			.start({ platform: "server", env: {}, scope: { workspaceId: "places-core" } }),
		{ authenticate: new AppCallerAuthenticate() },
	);
	return link;
}

export function placesOver(tabs: MemoryTabsGateway = new MemoryTabsGateway()): RemoteModule {
	return places({ over: placesLinkOf(tabs) });
}

export async function windowTabsIn(tabs: MemoryTabsGateway, window = MAIN_WINDOW): Promise<WindowTabs> {
	return windowTabsOf(momentOfWindow(await tabs.placedTabs(), window, BUILT_IN_APPS));
}
