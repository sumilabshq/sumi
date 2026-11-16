import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { HomePageFace } from "../schema/home-pages.schema.js";

export interface HomePagesConfig {
	readonly store?: StoreClient | undefined;
	readonly pages: readonly HomePageFace[];
}
