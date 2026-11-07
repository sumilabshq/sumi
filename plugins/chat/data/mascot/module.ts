import { Device, module } from "@widgetarium/data-framework";
import { mascotPartsOn } from "./gateways/mascot-parts/mascot-parts.gateway.js";
import { handled } from "./generated/handled.js";

export const MascotModule = module("mascot")
	.on(Device)
	.provide((facts) => mascotPartsOn(facts))
	.handles(...handled);
