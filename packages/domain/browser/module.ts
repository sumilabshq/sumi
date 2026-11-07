import { Device, module } from "@widgetarium/data-framework";
import { browserPartsOn } from "./gateways/browser-parts/browser-parts.gateway.js";
import type { BrowserConfig } from "./shared/host/browser.host.js";
import { handled } from "./generated/handled.js";

export type { BrowserConfig, BrowserPagesIpc } from "./shared/host/browser.host.js";

export const BrowserModule = module("browser")
	.on(Device)
	.config<BrowserConfig>()
	.provide((facts) => browserPartsOn(facts))
	.handles(...handled);
