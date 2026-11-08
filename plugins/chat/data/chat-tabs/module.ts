import { Device, module } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host";
import { layout } from "@widgetarium/layout";
import { places } from "@widgetarium/places";
import { workspaces } from "@widgetarium/workspaces";
import { handled } from "./generated/handled.js";

export const chatTabs = module()
	.on(Device)
	.imports(appHost, layout, places, workspaces)
	.provide(() => ({}))
	.handles(handled);
