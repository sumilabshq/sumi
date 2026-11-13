import { Device, module } from "@widgetarium/data-framework";
import { mascotPartsOn } from "./gateways/mascot-parts/mascot-parts.gateway.js";

export const mascot = module("mascot")
	.on(Device)
	.provide((facts) => mascotPartsOn(facts));
