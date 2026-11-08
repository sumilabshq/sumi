import { Device, module } from "@widgetarium/data-framework";
import { browserPartsOn } from "./gateways/browser-parts/browser-parts.gateway.js";
import type { BrowserConfig } from "./shared/host/browser.host.js";

export type { BrowserConfig, BrowserPagesIpc } from "./shared/host/browser.host.js";

export const browser = module("browser")
	.on(Device)
	.config<BrowserConfig>()
	.provide((facts) => browserPartsOn(facts));
