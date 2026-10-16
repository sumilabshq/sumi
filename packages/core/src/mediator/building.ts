import type { Inject } from "./token";
import type { App } from "./sends";

export interface Building {
	readonly inject: Inject;
	readonly sender: Pick<App, "send">;
}

const NOT_BUILDING = "{handler} is built only by app(): a module lists it, the app builds it";

// TRADE-OFF: a slot read while the container builds, so injection needs no decorator metadata.
const BUILDING: { current: Building | null } = { current: null };

export function buildingNow(handler: string): Building {
	const held = BUILDING.current;
	if (held === null) throw new Error(NOT_BUILDING.replace("{handler}", handler));
	return held;
}

export function isBuilding(building: Building): boolean {
	return BUILDING.current === building;
}

export function builtWith<T>(building: Building, make: () => T): T {
	const before = BUILDING.current;
	BUILDING.current = building;
	try {
		return make();
	} finally {
		BUILDING.current = before;
	}
}
