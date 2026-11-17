import { Device, module } from "@widgetarium/data-framework";
import { browser } from "@widgetarium/browser/contract";
import { navigation } from "@widgetarium/navigation/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { apps } from "@sumi/apps/contract";
import { appHostPartsOn } from "./gateways/app-host-parts/app-host-parts.gateway.js";
import type { AppHostConfig } from "./shared/host/app-host.host.js";

export type { AppHostConfig, CoreChanges } from "./shared/host/app-host.host.js";

export const appHost = module("app-host")
	.on(Device)
	.imports(apps, browser, navigation, workspaces)
	.config<AppHostConfig>()
	.provide((facts) => ({ ...appHostPartsOn(facts) }));
