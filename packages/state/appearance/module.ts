import { Anywhere, PublicGuard, module } from "@widgetarium/framework";
import { appearancePartsOn } from "./gateways/appearance-parts/appearance-parts.gateway.js";
import { SystemSchemeHost } from "./shared/host/system-scheme.host.js";
import { ChooseThemeCommand, RereadThemeSubscriber, ThemeQuery } from "./features/theme/requests.js";

export { SystemSchemeHost };
export type { SystemScheme } from "./shared/host/system-scheme.host.js";

export const AppearanceModule = module("appearance")
	.on(Anywhere)
	.needs({ systemScheme: SystemSchemeHost })
	.subscribers(RereadThemeSubscriber)
	.public(ThemeQuery, ChooseThemeCommand)
	.guard(PublicGuard)
	.provide((facts) => appearancePartsOn(facts));
