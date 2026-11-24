import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { useArrangement } from "../../../shared/lib/use-arrangement.js";
import { useListedApps } from "../../../shared/lib/use-listed-apps.js";
import { orderedBy } from "../../../shared/lib/tile-order.js";
import { appTilesOf, arrangedAppsOf } from "./app-tiles-of.js";
import type { AppTileFacts } from "./app-tiles-of.js";

export interface AppTiles {
	readonly tiles: readonly AppTileFacts[];
	open(appId: string): void;
	remove(appId: string): void;
	sort(appIds: readonly string[]): void;
	resize(appId: string, span: number): void;
}

export interface AppTilesPane {
	readonly flowId: string;
	readonly paneId: string;
}

export function useAppTiles({ flowId, paneId }: AppTilesPane): AppTiles {
	const { listed, artOf } = useListedApps();
	const { arrangement, arrangeApps } = useArrangement();
	const openTab = useCommand(appHost.flows.openTab);
	const tiles = appTilesOf(listed, arrangement, artOf);
	const arranged = (next: readonly AppTileFacts[], hiddenApps = arrangement.hiddenApps): void =>
		arrangeApps(arrangedAppsOf(next), hiddenApps);
	return {
		tiles,
		open: (app) => void openTab.run({ flowId, paneId, app, address: null }),
		remove: (appId) =>
			arranged(
				tiles.filter(({ id }) => id !== appId),
				[...arrangement.hiddenApps, appId],
			),
		sort: (appIds) =>
			arranged(
				orderedBy(
					tiles,
					({ id }) => id,
					appIds,
				),
			),
		resize: (appId, span) => arranged(tiles.map((tile) => (tile.id === appId ? { ...tile, span } : tile))),
	};
}
