import type { AppKind } from "../../schema/tabs.schema.js";
import type { AppAbilities, PlacedApp } from "../../host/places.host.js";

export interface PlacedApps {
	readonly byId: ReadonlyMap<string, PlacedApp>;
}

const PAGE_APP: AppAbilities = {
	holdsTabs: false,
	navigates: false,
	splits: false,
	runsInPage: true,
	keepsRecord: false,
};

export function placedAppsOf(apps: readonly PlacedApp[]): PlacedApps {
	return { byId: new Map(apps.map((app) => [app.id, app])) };
}

export function abilitiesOf(apps: PlacedApps, app: AppKind): AppAbilities {
	return apps.byId.get(app)?.abilities ?? PAGE_APP;
}

export function holdsTabs(apps: PlacedApps, { app }: { readonly app: AppKind }): boolean {
	return abilitiesOf(apps, app).holdsTabs;
}

export function holderIdsOf(
	apps: PlacedApps,
	tabs: readonly { readonly id: string; readonly app: AppKind }[],
): ReadonlySet<string> {
	return new Set(tabs.filter((tab) => holdsTabs(apps, tab)).map((tab) => tab.id));
}

export function isPageApp(apps: PlacedApps, app: AppKind): boolean {
	return abilitiesOf(apps, app).runsInPage;
}

export function navigates(apps: PlacedApps, app: AppKind): boolean {
	return abilitiesOf(apps, app).navigates;
}

export function holderAppOf(apps: PlacedApps): AppKind | null {
	return [...apps.byId.values()].find(({ abilities }) => abilities.holdsTabs)?.id ?? null;
}

export function navigatingAppOf(apps: PlacedApps): AppKind | null {
	return [...apps.byId.values()].find(({ abilities }) => abilities.navigates)?.id ?? null;
}
