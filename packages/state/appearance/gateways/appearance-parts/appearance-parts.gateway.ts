import { FontsGateway } from "../fonts/fonts.gateway.js";
import { MediaThemeGateway } from "../theme/media.gateway.js";
import type { ThemeGateway } from "../theme/theme.gateway.js";
import type { AppearanceConfig } from "../../shared/host/system-scheme.host.js";
import { tauriAppearanceParts } from "./tauri.gateway.js";

export type AppearanceParts = {
	readonly theme: ThemeGateway;
	readonly fonts: FontsGateway;
};

export function appearancePartsOn({ config }: { readonly config: AppearanceConfig }): AppearanceParts {
	if (config.tauri !== undefined) {
		return tauriAppearanceParts(config.tauri.store, config.systemScheme);
	}

	return {
		theme: new MediaThemeGateway(config.systemScheme),
		fonts: new FontsGateway(),
	};
}
