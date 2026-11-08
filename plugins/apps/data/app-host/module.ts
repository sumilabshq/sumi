import { Device, module } from "@widgetarium/data-framework";
import { browser } from "@widgetarium/browser";
import { layout } from "@widgetarium/layout";
import { places } from "@widgetarium/places";
import { workspaces } from "@widgetarium/workspaces";
import { apps } from "@sumi/apps";
import { appHostPartsOn } from "./gateways/app-host-parts/app-host-parts.gateway.js";
import type { AppHostConfig } from "./shared/host/app-host.host.js";
import { handled } from "./generated/handled.js";

export type { AppHostConfig, CoreChanges } from "./shared/host/app-host.host.js";

export const appHost = module()
	.on(Device)
	.imports(apps, browser, layout, places, workspaces)
	.config<AppHostConfig>()
	.provide((facts) => ({ ...appHostPartsOn(facts) }))
	.handles(handled);
