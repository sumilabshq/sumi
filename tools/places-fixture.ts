import type { z } from "zod";
import { localTransport } from "../packages/shared/core/src/requests/index.ts";
import type { RemoteModule, RemoteTransport } from "../packages/shared/core/src/requests/index.ts";
import { PlacesModule as PlacesContract } from "../packages/state/places/generated/contract.ts";
import { server } from "../packages/shared/core/src/requests/server/index.ts";
import { PlacesModule } from "../packages/state/places/module.ts";
import { KeptSessionTabsSchema, migratedTabsOf } from "../packages/state/places/gateways/tabs/tauri/kept-session.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../packages/state/places/gateways/windows/memory.gateway.ts";
import { momentOfWindow, windowTabsOf } from "../packages/state/places/shared/lib/tabs/kept-tabs.ts";
import type { PlacedTabs, WindowTabs } from "../packages/state/places/shared/schema/tabs.schema.ts";

export const MAIN_WINDOW = "main";

export type SeededTabs = z.input<typeof KeptSessionTabsSchema>;

export function placedTabsOf(
	seed: SeededTabs,
	chatIds: readonly string[] = [],
	pinnedIds: readonly string[] = [],
): PlacedTabs {
	return migratedTabsOf(
		KeptSessionTabsSchema.parse(seed),
		chatIds.map((id) => ({ id, isPinned: pinnedIds.includes(id), pinRank: pinnedIds.indexOf(id), lastAt: 0 })),
	);
}

export function placesLinkOf(tabs: MemoryTabsGateway): RemoteTransport {
	const link = localTransport();
	server()
		.modules(PlacesModule.with({ windows: new MemoryWindowsGateway({ windows: [] }), tabs }))
		.listen(link)
		.start({ env: {} });
	return link;
}

export function placesOver(tabs: MemoryTabsGateway = new MemoryTabsGateway()): RemoteModule {
	return PlacesContract.over(placesLinkOf(tabs));
}

export async function windowTabsIn(tabs: MemoryTabsGateway, window = MAIN_WINDOW): Promise<WindowTabs> {
	return windowTabsOf(momentOfWindow(await tabs.placedTabs(), window));
}
