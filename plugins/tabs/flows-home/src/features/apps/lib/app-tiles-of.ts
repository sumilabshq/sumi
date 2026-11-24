import type { AppFace } from "@sumi/apps/contract";
import type { Arrangement } from "@sumi/home-layout/contract";
import { orderedBy } from "../../../shared/lib/tile-order.js";

export interface AppTileFacts {
	readonly id: string;
	readonly title: string;
	readonly art: string;
	readonly span: number;
}

const DEFAULT_SPAN = 1;

export function appTilesOf(
	listed: readonly AppFace[],
	arrangement: Arrangement,
	artOf: (appId: string) => string,
): readonly AppTileFacts[] {
	const shown = listed.filter(({ id }) => !arrangement.hiddenApps.includes(id));
	return orderedBy(
		shown,
		({ id }) => id,
		arrangement.apps.map(({ app }) => app),
	).map(({ id, title }) => ({
		id,
		title,
		art: artOf(id),
		span: arrangement.apps.find(({ app }) => app === id)?.span ?? DEFAULT_SPAN,
	}));
}

export function arrangedAppsOf(tiles: readonly AppTileFacts[]): Arrangement["apps"] {
	return tiles.map(({ id, span }) => ({ app: id, span }));
}
