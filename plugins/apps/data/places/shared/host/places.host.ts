import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface TabStanding {
	readonly holderApp: string | null;
}

export type CanStandIn = (standing: TabStanding) => boolean;

export interface AppAbilities {
	readonly canStandIn: CanStandIn;
	readonly holdsTabs: boolean;
	readonly navigates: boolean;
	readonly splits: boolean;
	readonly runsInPage: boolean;
	readonly keepsRecord: boolean;
}

export interface PlacedApp {
	readonly id: string;
	readonly title: string;
	readonly newTabTitle: string | null;
	readonly art: string | null;
	readonly artOf: ((address: string) => string | null) | null;
	readonly abilities: AppAbilities;
}

export interface PlacesConfig {
	readonly store: StoreClient;
	readonly apps: readonly PlacedApp[];
}
