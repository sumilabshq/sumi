import { AuthenticatedGuard, Device, module } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { apps } from "@sumi/apps/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { groups } from "@sumi/groups/contract";

export const tabs = module("tabs")
	.on(Device)
	.imports(appHost, apps, chatTabs, groups)
	.guard(AuthenticatedGuard)
	.provide(() => ({}));
