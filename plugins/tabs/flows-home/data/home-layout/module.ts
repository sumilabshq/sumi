import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { homeLayoutPartsOn } from "./gateways/home-layout-parts/home-layout-parts.gateway.js";
import type { HomeLayoutConfig } from "./shared/host/home-layout.host.js";

export type { HomeLayoutConfig } from "./shared/host/home-layout.host.js";

export const homeLayout = module("home-layout")
	.on(Server)
	.config<HomeLayoutConfig>()
	.guard(PublicGuard)
	.provide((facts) => homeLayoutPartsOn(facts));
