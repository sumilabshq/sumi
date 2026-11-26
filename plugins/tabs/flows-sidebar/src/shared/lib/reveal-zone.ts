export const REVEAL_ZONE_MARK = { "data-reveal-zone": "" } as const;

export function isPointerInRevealZone(): boolean {
	return document.querySelector("[data-reveal-zone]:hover") !== null;
}
