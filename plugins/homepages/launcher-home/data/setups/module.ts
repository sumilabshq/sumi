import { Device, module } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { setupsPartsOn } from "./gateways/setups-parts/setups-parts.gateway.js";

export const setups = module("setups")
	.on(Device)
	.imports(appHost, chatTabs)
	.provide(() => setupsPartsOn());
