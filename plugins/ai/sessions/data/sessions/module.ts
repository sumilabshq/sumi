import { Device, module } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { workspaces } from "@widgetarium/workspaces/contract";

export const sessions = module("sessions")
	.on(Device)
	.imports(appHost, workspaces)
	.provide(() => ({}));
