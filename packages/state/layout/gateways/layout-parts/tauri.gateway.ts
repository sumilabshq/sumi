import { z } from "zod";
import { GLOBAL_ROOT, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";
import { USUAL_WIDTHS } from "../../shared/lib/frame-bounds.js";
import { KeptWidthsSchema, TauriFrameWidthsGateway } from "../frame-widths/tauri.gateway.js";
import type { LayoutParts } from "./layout-parts.gateway.js";

const SettingsSchema = z.looseObject(KeptWidthsSchema.shape);

type Settings = z.infer<typeof SettingsSchema>;

const SETTINGS: DocKind<Settings> = {
	file: "settings.json",
	v: 1,
	schema: SettingsSchema,
};

export function tauriLayoutParts(store: StoreClient): LayoutParts {
	const settings = HeldDoc.reading({ store, root: GLOBAL_ROOT, kind: SETTINGS, empty: SettingsSchema.parse({}) });
	return {
		frameWidths: new TauriFrameWidthsGateway(settings, USUAL_WIDTHS),
	};
}
