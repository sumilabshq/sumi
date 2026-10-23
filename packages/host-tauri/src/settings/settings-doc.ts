import { z } from "zod";
import { HeldDoc } from "../store/held-doc.js";
import { GLOBAL_ROOT } from "../store/store-client.js";
import type { DocKind, StoreClient } from "../store/store-client.js";

export const SettingsSchema = z.looseObject({
	chatWidthPx: z.number().positive().nullable().catch(null),
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
