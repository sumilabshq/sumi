import { z } from "zod";
import { GLOBAL_ROOT, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { SystemScheme } from "../../shared/host/system-scheme.host.js";
import { KeptFontsSchema, NO_KEPT_FONTS } from "../../shared/schema/fonts.schema.js";
import { ThemeChoiceSchema } from "../../shared/schema/theme.schema.js";
import { FontsGateway } from "../fonts/fonts.gateway.js";
import { heldKept } from "../kept/kept.gateway.js";
import { MediaThemeGateway, SYSTEM_CHOICE } from "../theme/media.gateway.js";
import type { AppearanceParts } from "./appearance-parts.gateway.js";

const SettingsSchema = z.looseObject({
	themeChoice: ThemeChoiceSchema.catch(SYSTEM_CHOICE),
	fonts: KeptFontsSchema.catch(NO_KEPT_FONTS),
});

type Settings = z.infer<typeof SettingsSchema>;

const SETTINGS: DocKind<Settings> = {
	file: "settings.json",
	v: 1,
	schema: SettingsSchema,
};

export function tauriAppearanceParts(store: StoreClient, system: SystemScheme): AppearanceParts {
	const settings = HeldDoc.reading({ store, root: GLOBAL_ROOT, kind: SETTINGS, empty: SettingsSchema.parse({}) });
	return {
		theme: new MediaThemeGateway(
			system,
			heldKept(settings, { read: (doc) => doc.themeChoice, write: (themeChoice) => ({ themeChoice }) }),
		),
		fonts: new FontsGateway(heldKept(settings, { read: (doc) => doc.fonts, write: (fonts) => ({ fonts }) })),
	};
}
