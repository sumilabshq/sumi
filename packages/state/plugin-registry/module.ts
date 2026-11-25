import { Device, PublicGuard, module } from "@widgetarium/data-framework";
import { registryPartsOn } from "./gateways/registry-parts/registry-parts.gateway.js";
import type { PluginRegistryConfig } from "./shared/host/registry.host.js";

export type { CatalogueEntry, PluginRegistryConfig } from "./shared/host/registry.host.js";

export const plugins = module("plugins")
	.on(Device)
	.config<PluginRegistryConfig>()
	.guard(PublicGuard)
	.provide((facts) => registryPartsOn(facts));
