import { Device, module } from "@widgetarium/data-framework";
import { layoutPartsOn } from "./gateways/layout-parts/layout-parts.gateway.js";
import type { LayoutConfig } from "./shared/host/layout.host.js";

export type { LayoutConfig, StudioWindows } from "./shared/host/layout.host.js";

export const layout = module("layout")
	.on(Device)
	.config<LayoutConfig>()
	.provide((facts) => ({ ...layoutPartsOn(facts) }));
