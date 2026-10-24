import { z } from "zod";
import { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { GLOBAL_ROOT } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";

export const SettingsSchema = z.looseObject({
	trace: z.boolean().catch(false),
});

export type Settings = z.infer<typeof SettingsSchema>;

export type HeldSettings = HeldDoc<Settings>;

export const SETTINGS: DocKind<Settings> = {
	file: "settings.json",
	v: 1,
	schema: SettingsSchema,
};

export const NO_SETTINGS: Settings = SettingsSchema.parse({});

export function readSettings(store: StoreClient): Promise<HeldSettings> {
	return HeldDoc.read({
		store,
		root: GLOBAL_ROOT,
		kind: SETTINGS,
		empty: NO_SETTINGS,
	});
}
