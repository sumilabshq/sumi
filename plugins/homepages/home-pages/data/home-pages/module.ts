import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { homePagesPartsOn } from "./gateways/home-pages-parts/home-pages-parts.gateway.js";
import type { HomePagesConfig } from "./shared/host/home-pages.host.js";

export type { HomePagesConfig } from "./shared/host/home-pages.host.js";

export const homePages = module("home-pages")
	.on(Server)
	.config<HomePagesConfig>()
	.guard(PublicGuard)
	.provide((facts) => homePagesPartsOn(facts));
