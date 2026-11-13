import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { artboardsPartsOn } from "./gateways/artboards-parts/artboards-parts.gateway.js";
import type { ArtboardsConfig } from "./shared/host/artboards.host.js";

export type { ArtboardsConfig } from "./shared/host/artboards.host.js";

export const artboards = module("artboards")
	.on(Server)
	.config<ArtboardsConfig>()
	.guard(PublicGuard)
	.provide((facts) => artboardsPartsOn(facts));
