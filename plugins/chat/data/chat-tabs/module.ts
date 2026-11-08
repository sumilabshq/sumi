import { Device, module } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { layout } from "@widgetarium/layout/contract";
import { places } from "@widgetarium/places/contract";
import { workspaces } from "@widgetarium/workspaces/contract";

export const chatTabs = module("chat-tabs")
	.on(Device)
	.imports(appHost, layout, places, workspaces)
	.provide(() => ({}));
