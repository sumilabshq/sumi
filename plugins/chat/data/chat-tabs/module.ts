import { Device, module } from "@widgetarium/data-framework";
import { AppHostModule } from "@widgetarium/app-host";
import { LayoutModule } from "@widgetarium/layout";
import { PlacesModule } from "@widgetarium/places";
import { WorkspacesModule } from "@widgetarium/workspaces";
import { handled } from "./generated/handled.js";

export const ChatTabsModule = module("chat-tabs")
	.on(Device)
	.imports(AppHostModule, LayoutModule, PlacesModule, WorkspacesModule)
	.provide(() => ({}))
	.handles(...handled);
