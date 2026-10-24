interface SidebarBounds {
	readonly leastPx: number;
	readonly usualPx: number;
	readonly keptBesidePx: number;
}

export const SIDEBAR_BOUNDS: SidebarBounds = {
	leastPx: 160,
	usualPx: 200,
	keptBesidePx: 320,
};

export function sidebarPxWithin(px: number, roomPx: number): number {
	return sidebarPxFloored(Math.min(px, roomPx - SIDEBAR_BOUNDS.keptBesidePx));
}

export function sidebarPxOf(kept: number | null): number {
	return sidebarPxFloored(kept ?? SIDEBAR_BOUNDS.usualPx);
}

function sidebarPxFloored(px: number): number {
	return Math.round(Math.max(SIDEBAR_BOUNDS.leastPx, px));
}
