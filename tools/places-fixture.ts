import { BUILT_IN_APPS, builtInPlacedApps } from "./placed-apps-fixture.ts";
import type { z } from "zod";
import { localTransport, runtime } from "../packages/shared/data-framework/src/index.ts";
import type { RemoteModule, RemoteTransport } from "../packages/shared/data-framework/src/index.ts";
import { PlacesModule as PlacesContract } from "../plugins/apps/data/places/generated/contract.ts";
import { PlacesModule } from "../plugins/apps/data/places/module.ts";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { KeptSessionTabsSchema, migratedTabsOf } from "../plugins/apps/data/places/gateways/tabs/tauri/kept-session.ts";
import { MemoryTabsGateway } from "../plugins/apps/data/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../plugins/apps/data/places/gateways/windows/memory.gateway.ts";
import { momentOfWindow, windowTabsOf } from "../plugins/apps/data/places/shared/lib/tabs/kept-tabs.ts";
import type { PlacedTabs, TabMark, WindowTabs } from "../plugins/apps/data/places/shared/schema/tabs.schema.ts";

export const MAIN_WINDOW = "main";

export type SeededTabs = z.input<typeof KeptSessionTabsSchema>;

export interface SeededFacts {
	readonly title?: string;
	readonly mark?: TabMark;
}

export function placedTabsOf(
	seed: SeededTabs,
	chatIds: readonly string[] = [],
	pinnedIds: readonly string[] = [],
	factsOf: Readonly<Record<string, SeededFacts>> = {},
): PlacedTabs {
	const placed = migratedTabsOf(
		KeptSessionTabsSchema.parse(seed),
		chatIds.map((id) => ({ id, isPinned: pinnedIds.includes(id), pinRank: pinnedIds.indexOf(id), lastAt: 0 })),
	);
	return {
		...placed,
		tabs: placed.tabs.map((tab) => ({ ...tab, ...factsOf[tab.id] })),
	};
}

export function placesLinkOf(tabs: MemoryTabsGateway): RemoteTransport {
	const link = localTransport();
	link.serve(
		runtime()
			.modules(
				PlacesModule({
					injects: { windows: new MemoryWindowsGateway({ windows: [] }), tabs, placedApps: builtInPlacedApps() },
				}),
			)
			.start({ platform: "server", env: {} }),
		{ authenticate: new AppCallerAuthenticate() },
	);
	return link;
}

export function placesOver(tabs: MemoryTabsGateway = new MemoryTabsGateway()): RemoteModule {
	return PlacesContract({ over: placesLinkOf(tabs) });
}

export async function windowTabsIn(tabs: MemoryTabsGateway, window = MAIN_WINDOW): Promise<WindowTabs> {
	return windowTabsOf(momentOfWindow(await tabs.placedTabs(), window, BUILT_IN_APPS));
}
