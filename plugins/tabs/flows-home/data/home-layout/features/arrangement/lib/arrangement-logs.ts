import type { AppTile } from "../../../shared/schema/arrangement.schema.js";

export function setupsMovedReason(was: readonly string[], now: readonly string[]): string {
	return `home setups ${was.join(",") || "none"} → ${now.join(",") || "none"}`;
}

export function appsMovedReason(
	was: { readonly apps: readonly AppTile[]; readonly hiddenApps: readonly string[] },
	now: { readonly apps: readonly AppTile[]; readonly hiddenApps: readonly string[] },
): string {
	return `home apps ${appsLine(was)} → ${appsLine(now)}`;
}

function appsLine({ apps, hiddenApps }: { readonly apps: readonly AppTile[]; readonly hiddenApps: readonly string[] }): string {
	const shown = apps.map(({ app, span }) => `${app}x${span}`).join(",") || "none";
	return hiddenApps.length === 0 ? shown : `${shown} hidden ${hiddenApps.join(",")}`;
}
