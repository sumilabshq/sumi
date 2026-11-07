import { Anywhere, PublicGuard, module } from "@widgetarium/data-framework";
import { appearancePartsOn } from "./gateways/appearance-parts/appearance-parts.gateway.js";
import type { AppearanceConfig } from "./shared/host/system-scheme.host.js";
import { handled } from "./generated/handled.js";

export type { AppearanceConfig, SystemScheme } from "./shared/host/system-scheme.host.js";

export const AppearanceModule = module("appearance")
	.on(Anywhere)
	.config<AppearanceConfig>()
	.guard(PublicGuard)
	.provide((facts) => appearancePartsOn(facts))
	.handles(...handled);
