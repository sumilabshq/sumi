import { AuthenticatedGuard, Device, module } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { browser } from "@widgetarium/browser/contract";

export const pages = module("pages")
	.on(Device)
	.imports(appHost, browser)
	.guard(AuthenticatedGuard)
	.provide(() => ({}));
