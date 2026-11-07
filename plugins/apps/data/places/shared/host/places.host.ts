import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface AppAbilities {
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
