import { Device, module } from "@widgetarium/data-framework";
import { filePagePartsOn } from "./gateways/file-page-parts/file-page-parts.gateway.js";
import { handled } from "./generated/handled.js";

export const FilePageModule = module("file-page")
	.on(Device)
	.provide((facts) => filePagePartsOn(facts))
	.handles(...handled);
