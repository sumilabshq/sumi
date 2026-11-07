import { Device, module } from "@widgetarium/data-framework";
import { BrowserModule } from "@widgetarium/browser";
import { LayoutModule } from "@widgetarium/layout";
import { PlacesModule } from "@widgetarium/places";
import { WorkspacesModule } from "@widgetarium/workspaces";
import { AppsModule } from "@sumi/apps";
import { appHostPartsOn } from "./gateways/app-host-parts/app-host-parts.gateway.js";
import type { AppHostConfig } from "./shared/host/app-host.host.js";
import { handled } from "./generated/handled.js";

export type { AppHostConfig, CoreChanges } from "./shared/host/app-host.host.js";

export const AppHostModule = module("app-host")
	.on(Device)
	.imports(AppsModule, BrowserModule, LayoutModule, PlacesModule, WorkspacesModule)
	.config<AppHostConfig>()
	.provide((facts) => ({ ...appHostPartsOn(facts) }))
	.handles(...handled);
