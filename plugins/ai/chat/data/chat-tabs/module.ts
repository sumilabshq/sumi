import { Device, module } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { layout } from "@widgetarium/layout/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { chatFacts } from "@sumi/chat-facts/contract";
import { chatTabsPartsOn } from "./gateways/chat-tabs-parts/chat-tabs-parts.gateway.js";

export const chatTabs = module("chat-tabs")
	.on(Device)
	.imports(appHost, chatFacts, layout, workspaces)
	.provide((facts) => chatTabsPartsOn(facts));
