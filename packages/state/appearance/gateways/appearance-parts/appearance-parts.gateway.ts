import type { SystemScheme } from "../../shared/host/system-scheme.host.js";
import type { ThemeGateway } from "../theme/theme.gateway.js";
import { MediaThemeGateway } from "../theme/media.gateway.js";

export type AppearanceParts = {
	readonly theme: ThemeGateway;
};

export function appearancePartsOn({
	config,
}: {
	readonly config: { readonly systemScheme: SystemScheme };
}): AppearanceParts {
	return {
		theme: new MediaThemeGateway(config.systemScheme),
	};
}
